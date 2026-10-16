import AVFoundation
let a = AVURLAsset(url: URL(fileURLWithPath: CommandLine.arguments[1]))
print("duration", String(format: "%.2f", CMTimeGetSeconds(a.duration)))
for t in a.tracks { print(t.mediaType.rawValue, t.naturalSize, "fps", t.nominalFrameRate, "kbps", Int(t.estimatedDataRate / 1000)) }
if let at = a.tracks(withMediaType: .audio).first {
  let r = try! AVAssetReader(asset: a)
  let o = AVAssetReaderTrackOutput(track: at, outputSettings: [AVFormatIDKey: kAudioFormatLinearPCM, AVLinearPCMBitDepthKey: 16, AVLinearPCMIsFloatKey: false, AVLinearPCMIsBigEndianKey: false, AVLinearPCMIsNonInterleaved: false])
  r.add(o); r.startReading()
  var sec: [Double] = [], acc = 0.0, n = 0, peak = 0
  while let sb = o.copyNextSampleBuffer(), let bb = CMSampleBufferGetDataBuffer(sb) {
    var len = 0; var p: UnsafeMutablePointer<Int8>? = nil
    CMBlockBufferGetDataPointer(bb, atOffset: 0, lengthAtOffsetOut: nil, totalLengthOut: &len, dataPointerOut: &p)
    p!.withMemoryRebound(to: Int16.self, capacity: len / 2) { s in
      for i in 0..<(len / 2) { let v = Int(s[i]); peak = max(peak, abs(v)); acc += Double(v * v); n += 1; if n == 96000 { sec.append(sqrt(acc / Double(n)) / 32768); acc = 0; n = 0 } }
    }
  }
  print("peak", String(format: "%.2f", Double(peak) / 32768), "rms/sec", sec.map { String(format: "%.3f", $0) }.joined(separator: " "))
}
