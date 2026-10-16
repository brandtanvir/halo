// vjumps video.mp4 — decode every frame of the final file and flag frame-to-frame spikes (snaps, pops, hard cuts)
import AVFoundation
import CoreImage

let url = URL(fileURLWithPath: CommandLine.arguments[1])
let asset = AVURLAsset(url: url)
let track = asset.tracks(withMediaType: .video)[0]
let reader = try! AVAssetReader(asset: asset)
let out = AVAssetReaderTrackOutput(track: track, outputSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA])
reader.add(out); reader.startReading()
let W = 64, H = 64
var prev: [Float]? = nil
var diffs: [Float] = []
while let sb = out.copyNextSampleBuffer(), let pb = CMSampleBufferGetImageBuffer(sb) {
  CVPixelBufferLockBaseAddress(pb, .readOnly)
  let w = CVPixelBufferGetWidth(pb), h = CVPixelBufferGetHeight(pb), bpr = CVPixelBufferGetBytesPerRow(pb)
  let base = CVPixelBufferGetBaseAddress(pb)!.assumingMemoryBound(to: UInt8.self)
  var cur = [Float](repeating: 0, count: W * H)
  for y in 0..<H { for x in 0..<W {
    // average a small block per cell (luma-ish)
    var s: Float = 0; var n: Float = 0
    let x0 = x * w / W, y0 = y * h / H
    for dy in stride(from: 0, to: max(1, h / H), by: 4) { for dx in stride(from: 0, to: max(1, w / W), by: 4) {
      let p = base + (y0 + dy) * bpr + (x0 + dx) * 4
      s += 0.11 * Float(p[0]) + 0.59 * Float(p[1]) + 0.3 * Float(p[2]); n += 1
    } }
    cur[y * W + x] = s / n
  } }
  CVPixelBufferUnlockBaseAddress(pb, .readOnly)
  if let p = prev { var d: Float = 0; for i in 0..<cur.count { d += abs(cur[i] - p[i]) }; diffs.append(d / Float(cur.count)) } else { diffs.append(0) }
  prev = cur
}
var spikes: [(Int, Float, Float)] = []
for i in 1..<diffs.count {
  let lo = max(1, i - 6), hi = min(diffs.count - 1, i + 6)
  var nb = Array(diffs[lo...hi]); nb.remove(at: i - lo); nb.sort()
  let med = nb[nb.count / 2]
  if diffs[i] > 2.0 && diffs[i] > max(med * 3.5, med + 1.6) { spikes.append((i, diffs[i], med)) }
}
print("\(url.lastPathComponent): \(diffs.count) frames decoded, mean Δ \(String(format: "%.2f", diffs.reduce(0, +) / Float(diffs.count))), max Δ \(String(format: "%.2f", diffs.max() ?? 0)), spikes: \(spikes.count)")
for (i, d, m) in spikes.prefix(20) { print(String(format: "  frame %d (%.2fs)  Δ %.2f  (local %.2f)", i, Double(i) / 60, d, m)) }
