import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import CleverTapReact
import CleverTapSDK
import Firebase
import UserNotifications
import CoreLocation

@main
class AppDelegate: RCTAppDelegate, UNUserNotificationCenterDelegate {

  override func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
    
    // React Native setup
    self.moduleName = "ecommerceApp"
    self.dependencyProvider = RCTAppDependencyProvider()
    self.initialProps = [:]
    
    // Firebase init (optional if used)
    FirebaseApp.configure()
    
    // CleverTap init
    CleverTap.setDebugLevel(CleverTapLogLevel.debug.rawValue)
    CleverTap.autoIntegrate()
    
    // Notify CleverTap React Native SDK
    CleverTapReactManager.sharedInstance()?.applicationDidLaunch(options: launchOptions)
    
    // Register push categories
    let action1 = UNNotificationAction(identifier: "action_1", title: "Back", options: [])
    let action2 = UNNotificationAction(identifier: "action_2", title: "Next", options: [])
    let action3 = UNNotificationAction(identifier: "action_3", title: "View In App", options: [])
    let category = UNNotificationCategory(identifier: "CTNotification", actions: [action1, action2, action3], intentIdentifiers: [], options: [])
    UNUserNotificationCenter.current().setNotificationCategories([category])
    
    // Register for push notifications
    registerForPushNotifications()
    
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  // MARK: - Push Registration
  func registerForPushNotifications() {
    let center = UNUserNotificationCenter.current()
    center.delegate = self
    center.requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
      if granted {
        DispatchQueue.main.async {
          UIApplication.shared.registerForRemoteNotifications()
        }
      } else {
        print("❌ Push permission not granted: \(error?.localizedDescription ?? "No error")")
      }
    }
  }

  // MARK: - Token Handlers
  override func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    NSLog("%@: registered for remote notifications: %@", self.description, deviceToken.description)
    CleverTap.sharedInstance()?.setPushToken(deviceToken)

  }

  override func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
    print("❌ Failed to register for remote notifications: \(error.localizedDescription)")
  }

  // MARK: - Push Notification Handling
  func userNotificationCenter(_ center: UNUserNotificationCenter,
                              didReceive response: UNNotificationResponse,
                              withCompletionHandler completionHandler: @escaping () -> Void) {
    print("📩 Did receive notification response: \(response.notification.request.content.userInfo)")
    completionHandler()
  }

  func userNotificationCenter(_ center: UNUserNotificationCenter,
                              willPresent notification: UNNotification,
                              withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
    print("📩 Will present notification: \(notification.request.content.userInfo)")
    CleverTap.sharedInstance()?.recordNotificationViewedEvent(withData: notification.request.content.userInfo)
    completionHandler([.badge, .sound, .alert])
  }

  override func application(_ application: UIApplication,
                            didReceiveRemoteNotification userInfo: [AnyHashable : Any],
                            fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void) {
    print("📩 Received remote notification: \(userInfo)")
    completionHandler(.noData)
  }

  // Optional custom extras
  func pushNotificationTapped(withCustomExtras customExtras: [AnyHashable : Any]!) {
    print("📩 Push tapped with extras: \(String(describing: customExtras))")
  }

  // MARK: - React Native Bundle
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}

