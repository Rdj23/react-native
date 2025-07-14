import auth from '@react-native-firebase/auth';
import CleverTap from 'clevertap-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const updateCleverTapProfile = (user) => {
  if (!user) return;

  CleverTap.onUserLogin({
    'Name': user.displayName || 'User',
    
    'Email': user.email,
    // You can add more properties like Phone, Gender, etc. if available
     'Identity': user.email,

    'MSG-email': true,  
    'UserType': 'newUser'

  });
};

export const registerWithEmail = async (email, password, name) => {
  try {
    const userCredential = await auth().createUserWithEmailAndPassword(email, password);
    await userCredential.user.updateProfile({ displayName: name });

    // CleverTap integration
    updateCleverTapProfile(userCredential.user);

    return userCredential.user;
  } catch (error) {
    throw error;
  }
};


export const loginWithEmail = async (email, password) => {
  try {
    const userCredential = await auth().signInWithEmailAndPassword(email, password);
    const user = userCredential.user;

    // 🔁 Check if preferences or profile data exists
    const savedData = await AsyncStorage.getItem('user');
    let restoredData = savedData ? JSON.parse(savedData) : null;

    const finalUserData = {
      name: user.displayName || '',
      email: user.email,
      phone: restoredData?.phone || '',
      avatarUrl: restoredData?.avatarUrl || '',
      preferences: restoredData?.preferences || {
        whatsapp: false,
        push: true,
        sms: false,
        email: true,
      },
    };

    // 👇 Sync to context
    return finalUserData;

  } catch (error) {
    throw error;
  }
};


