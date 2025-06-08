import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import Firebase  

//clevertap
import CleverTapReact
import CleverTapSDK
import CoreLocation

@main
class AppDelegate: UIResponder, UIApplicationDelegate, RCTBridgeDelegate {
  var window: UIWindow?
  var bridge: RCTBridge!

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    // 1️⃣ Init native SDKs
    FirebaseApp.configure()
    CleverTap.autoIntegrate()
    CleverTapReactManager.sharedInstance()?.applicationDidLaunch(options: launchOptions)

    // 2️⃣ Create the React bridge
    bridge = RCTBridge(delegate: self, launchOptions: launchOptions)

    // 3️⃣ Host it in an RCTRootView
    let rootView = RCTRootView(
      bridge: bridge!,
      moduleName: "ecommerceApp",
      initialProperties: nil
    )

    // 4️⃣ Swap in your window
    let rootVC = UIViewController()
    rootVC.view = rootView

    window = UIWindow(frame: UIScreen.main.bounds)
    window?.rootViewController = rootVC
    window?.makeKeyAndVisible()

    return true
  }

  // MARK: - RCTBridgeDelegate
  func sourceURL(for bridge: RCTBridge!) -> URL! {
    #if DEBUG
      return RCTBundleURLProvider.sharedSettings()
      .jsBundleURL(forBundleRoot: "index", fallbackExtension: nil)
    #else
      return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
    #endif
  }
}
