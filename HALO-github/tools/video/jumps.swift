// jumps <frames_dir> — flags frames whose change from the previous frame spikes far above the local norm.
// A smooth sequence changes gradually; a snap/pop/hard cut shows up as an isolated spike.
import Foundation
import CoreGraphics
import ImageIO

let dir = CommandLine.arguments[1]
let files = (try! FileManager.default.contentsOfDirectory(atPath: dir)).filter { $0.hasSuffix(".jpg") }.sorted()
let w = 96, h = 96
func thumb(_ f: String) -> [Float] {
  let src = CGImageSourceCreateWithURL(URL(fileURLWithPath: dir + "/" + f) as CFURL, nil)!
  let im = CGImageSourceCreateThumbnailAtIndex(src, 0, [kCGImageSourceCreateThumbnailFromImageAlways: true, kCGImageSourceThumbnailMaxPixelSize: 160] as CFDictionary)!
  var px = [UInt8](repeating: 0, count: w * h)
  let ctx = CGContext(data: &px, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w, space: CGColorSpaceCreateDeviceGray(), bitmapInfo: 0)!
  ctx.interpolationQuality = .medium
  ctx.draw(im, in: CGRect(x: 0, y: 0, width: w, height: h))
  return px.map { Float($0) }
}
var diffs: [Float] = [0]
var prev = thumb(files[0])
for f in files.dropFirst() {
  let cur = thumb(f)
  var s: Float = 0
  for i in 0..<cur.count { s += abs(cur[i] - prev[i]) }
  diffs.append(s / Float(cur.count))
  prev = cur
}
// spike = diff much larger than the median of its ±6-frame neighbourhood (and visibly large)
var flagged: [(Int, Float, Float)] = []
for i in 1..<diffs.count {
  let lo = max(1, i - 6), hi = min(diffs.count - 1, i + 6)
  var nb = Array(diffs[lo...hi]); nb.remove(at: i - lo); nb.sort()
  let med = nb[nb.count / 2]
  if diffs[i] > 2.0 && diffs[i] > max(med * 3.5, med + 1.6) { flagged.append((i, diffs[i], med)) }
}
let mx = diffs.max() ?? 0
print("\((dir as NSString).lastPathComponent): \(files.count) frames, mean Δ \(String(format: "%.2f", diffs.reduce(0, +) / Float(diffs.count))), max Δ \(String(format: "%.2f", mx)), spikes: \(flagged.count)")
for (i, d, m) in flagged.prefix(12) { print(String(format: "  frame %d  Δ %.2f  (local %.2f)", i, d, m)) }
