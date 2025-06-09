import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

@main
class AppDelegate: UIResponder, UIApplicationDelegate, RCTBridgeDelegate {
  var window: UIWindow?
  var bridge: RCTBridge!

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)
    window?.rootViewController = rootVC
    window?.makeKeyAndVisible()

    return true
  }

  // MARK: – RCTBridgeDelegate
  func sourceURL(for bridge: RCTBridge!) -> URL! {
    #if DEBUG
    return RCTBundleURLProvider
             .sharedSettings()
             .jsBundleURL(
               forBundleRoot:   "index",
               fallbackExtension: nil    // <-- use fallbackExtension, not fallbackResource
             )
    #else
    return Bundle.main.url(
      forResource: "main",
      withExtension: "jsbundle"
    )
    #endif
  }
}
