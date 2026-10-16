// sheet out.jpg cols thumbW img1 img2 ... — contact sheet with filename labels
import AppKit
let a = CommandLine.arguments
let out = a[1], cols = Int(a[2])!, tw = CGFloat(Double(a[3])!)
let files = Array(a[4...])
var imgs: [(String, CGImage)] = []
for f in files {
  guard let src = CGImageSourceCreateWithURL(URL(fileURLWithPath: f) as CFURL, nil),
        let im = CGImageSourceCreateImageAtIndex(src, 0, nil) else { continue }
  imgs.append(((f as NSString).lastPathComponent, im))
}
guard let first = imgs.first?.1 else { exit(1) }
let th = tw * CGFloat(first.height) / CGFloat(first.width)
let rows = (imgs.count + cols - 1) / cols
let W = Int(tw) * cols + 6 * (cols + 1), H = Int(th + 22) * rows + 6 * (rows + 1)
let ctx = CGContext(data: nil, width: W, height: H, bitsPerComponent: 8, bytesPerRow: 0, space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
ctx.setFillColor(CGColor(red: 0.12, green: 0.12, blue: 0.13, alpha: 1)); ctx.fill(CGRect(x: 0, y: 0, width: W, height: H))
NSGraphicsContext.current = NSGraphicsContext(cgContext: ctx, flipped: false)
for (i, (name, im)) in imgs.enumerated() {
  let c = i % cols, r = i / cols
  let x = CGFloat(6 + c * (Int(tw) + 6)), y = CGFloat(H) - CGFloat(6 + (r + 1) * (Int(th + 22) + 6)) + 6
  ctx.draw(im, in: CGRect(x: x, y: y + 22, width: tw, height: th))
  (name as NSString).draw(at: NSPoint(x: x + 2, y: y + 3), withAttributes: [.font: NSFont.monospacedSystemFont(ofSize: 13, weight: .regular), .foregroundColor: NSColor.white])
}
let img = ctx.makeImage()!
let rep = NSBitmapImageRep(cgImage: img)
try! rep.representation(using: .jpeg, properties: [.compressionFactor: 0.8])!.write(to: URL(fileURLWithPath: out))
