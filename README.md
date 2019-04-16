# react-native-sp-auth

## Getting started

`$ yarn add react-native-sp-auth`

### Mostly automatic installation

`$ react-native link react-native-sp-auth`

### Manual installation


#### iOS

1. In XCode, in the project navigator, right click `Libraries` ➜ `Add Files to [your project's name]`
2. Go to `node_modules` ➜ `react-native-sp-auth` and add `RNSpAuth.xcodeproj`
3. In XCode, in the project navigator, select your project. Add `libRNSpAuth.a` to your project's `Build Phases` ➜ `Link Binary With Libraries`
4. Run your project (`Cmd+R`)<

#### Android

1. Open up `android/app/src/main/java/[...]/MainApplication.java`
  - Add `import com.fx.rnspauth.RNSpAuthPackage;` to the imports at the top of the file
  - Add `new RNSpAuthPackage()` to the list returned by the `getPackages()` method
2. Append the following lines to `android/settings.gradle`:
  	```
  	include ':react-native-sp-auth'
  	project(':react-native-sp-auth').projectDir = new File(rootProject.projectDir, 	'../node_modules/react-native-sp-auth/android')
  	```
3. Insert the following lines inside the dependencies block in `android/app/build.gradle`:
  	```
      compile project(':react-native-sp-auth')
  	```


## Usage
```typescript
import RNSharePointAuth from 'react-native-sp-auth';

const sp = new RNSharePointAuth('https://yoursite.sharepoint.com');
const { digest, cookie } = await sp.login('yourusername@yourdomain', 'yourpassword');

// renew digest
const newDigest = await sp.renewDigest();
```
  