// encode manifest.json — frame folders → H.264 MP4 with eased crossfades, fades, and an AAC soundtrack.
// manifest: { out, width, height, fps, bitrate, audio?, fadeIn, fadeOut, xfade, segments: [{ dir, from, to }] }
import Foundation
import AVFoundation
import CoreGraphics
import ImageIO

struct Seg: Decodable { let dir: String; let from: Int; let to: Int }
struct Manifest: Decodable {
  let out: String; let width: Int; let height: Int; let fps: Int; let bitrate: Int
  let audio: String?; let fadeIn: Int; let fadeOut: Int; let xfade: Int; let segments: [Seg]
}
let m = try! JSONDecoder().decode(Manifest.self, from: Data(contentsOf: URL(fileURLWithPath: CommandLine.arguments[1])))

// timeline: segment i starts at start[i]; consecutive segments overlap by xfade frames
var starts: [Int] = []; var t = 0
for (i, s) in m.segments.enumerated() { starts.append(t); t += (s.to - s.from) - (i < m.segments.count - 1 ? m.xfade : 0) }
let total = t
func easeIO(_ x: Double) -> Double { x < 0.5 ? 4 * x * x * x : 1 - pow(-2 * x + 2, 3) / 2 }   // smooth, never snappy

func load(_ seg: Seg, _ k: Int) -> CGImage? {
  let idx = min(seg.to - 1, max(seg.from, seg.from + k))
  let url = URL(fileURLWithPath: seg.dir).appendingPathComponent(String(format: "%06d.jpg", idx))
  guard let src = CGImageSourceCreateWithURL(url as CFURL, nil) else { return nil }
  return CGImageSourceCreateImageAtIndex(src, 0, [kCGImageSourceShouldCache: false] as CFDictionary)
}

try? FileManager.default.removeItem(atPath: m.out)
let writer = try! AVAssetWriter(outputURL: URL(fileURLWithPath: m.out), fileType: .mp4)
let vIn = AVAssetWriterInput(mediaType: .video, outputSettings: [
  AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: m.width, AVVideoHeightKey: m.height,
  AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: m.bitrate, AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
                                    AVVideoMaxKeyFrameIntervalKey: m.fps * 2, AVVideoExpectedSourceFrameRateKey: m.fps],
  AVVideoColorPropertiesKey: [AVVideoColorPrimariesKey: AVVideoColorPrimaries_ITU_R_709_2, AVVideoTransferFunctionKey: AVVideoTransferFunction_ITU_R_709_2, AVVideoYCbCrMatrixKey: AVVideoYCbCrMatrix_ITU_R_709_2],
])
vIn.expectsMediaDataInRealTime = false
let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: vIn, sourcePixelBufferAttributes: [
  kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA, kCVPixelBufferWidthKey as String: m.width, kCVPixelBufferHeightKey as String: m.height,
])
writer.add(vIn)

var aIn: AVAssetWriterInput? = nil
var aReader: AVAssetReader? = nil
var aOut: AVAssetReaderTrackOutput? = nil
if let ap = m.audio {
  let asset = AVURLAsset(url: URL(fileURLWithPath: ap))
  let track = asset.tracks(withMediaType: .audio)[0]
  aReader = try! AVAssetReader(asset: asset)
  aOut = AVAssetReaderTrackOutput(track: track, outputSettings: [AVFormatIDKey: kAudioFormatLinearPCM, AVLinearPCMBitDepthKey: 16, AVLinearPCMIsFloatKey: false, AVLinearPCMIsBigEndianKey: false, AVLinearPCMIsNonInterleaved: false])
  aReader!.add(aOut!)
  aReader!.timeRange = CMTimeRange(start: .zero, duration: CMTime(value: CMTimeValue(total), timescale: CMTimeScale(m.fps)))
  let ai = AVAssetWriterInput(mediaType: .audio, outputSettings: [AVFormatIDKey: kAudioFormatMPEG4AAC, AVNumberOfChannelsKey: 2, AVSampleRateKey: 48000, AVEncoderBitRateKey: 256000])
  ai.expectsMediaDataInRealTime = false
  writer.add(ai); aIn = ai
}

writer.startWriting(); writer.startSession(atSourceTime: .zero)
aReader?.startReading()
let space = CGColorSpace(name: CGColorSpace.sRGB)!
let group = DispatchGroup()

group.enter()
var f = 0
vIn.requestMediaDataWhenReady(on: DispatchQueue(label: "v")) {
  while vIn.isReadyForMoreMediaData {
    if f >= total { vIn.markAsFinished(); group.leave(); return }
    autoreleasepool {
      var pb: CVPixelBuffer? = nil
      CVPixelBufferPoolCreatePixelBuffer(nil, adaptor.pixelBufferPool!, &pb)
      CVPixelBufferLockBaseAddress(pb!, [])
      let ctx = CGContext(data: CVPixelBufferGetBaseAddress(pb!), width: m.width, height: m.height, bitsPerComponent: 8,
                          bytesPerRow: CVPixelBufferGetBytesPerRow(pb!), space: space,
                          bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue)!
      ctx.interpolationQuality = .high
      ctx.setFillColor(CGColor(red: 0, green: 0, blue: 0, alpha: 1))
      ctx.fill(CGRect(x: 0, y: 0, width: m.width, height: m.height))
      let rect = CGRect(x: 0, y: 0, width: m.width, height: m.height)
      // which segments cover frame f
      for (i, s) in m.segments.enumerated() {
        let k = f - starts[i], len = s.to - s.from
        if k < 0 || k >= len { continue }
        var alpha = 1.0
        if i > 0 && k < m.xfade { alpha = easeIO(Double(k + 1) / Double(m.xfade + 1)) }   // incoming segment fades over the outgoing one
        if let im = load(s, k) { ctx.setAlpha(CGFloat(alpha)); ctx.draw(im, in: rect) }
      }
      ctx.setAlpha(1)
      // fade in/out through black
      var black = 0.0
      if f < m.fadeIn { black = 1 - easeIO(Double(f) / Double(m.fadeIn)) }
      if f >= total - m.fadeOut { black = max(black, easeIO(Double(f - (total - m.fadeOut)) / Double(m.fadeOut))) }
      if black > 0 { ctx.setFillColor(CGColor(red: 0, green: 0, blue: 0, alpha: CGFloat(black))); ctx.fill(rect) }
      CVPixelBufferUnlockBaseAddress(pb!, [])
      adaptor.append(pb!, withPresentationTime: CMTime(value: CMTimeValue(f), timescale: CMTimeScale(m.fps)))
      f += 1
      if f % 600 == 0 { print("video \(f)/\(total)"); fflush(stdout) }
    }
  }
}
if let ai = aIn, let ao = aOut {
  group.enter()
  ai.requestMediaDataWhenReady(on: DispatchQueue(label: "a")) {
    while ai.isReadyForMoreMediaData {
      if let sb = ao.copyNextSampleBuffer() { ai.append(sb) } else { ai.markAsFinished(); group.leave(); return }
    }
  }
}
group.wait()
let done = DispatchSemaphore(value: 0)
writer.finishWriting { done.signal() }
done.wait()
print(writer.status == .completed ? "wrote \(m.out) — \(total) frames, \(String(format: "%.1f", Double(total) / Double(m.fps)))s" : "FAILED \(String(describing: writer.error))")
