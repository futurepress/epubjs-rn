package com.epubreader;

import android.app.Application;

import com.facebook.react.ReactApplication;
import com.rnziparchive.RNZipArchivePackage;
import com.oblador.vectoricons.VectorIconsPackage;
import com.futurepress.staticserver.FPStaticServerPackage;
import com.github.yamill.orientation.OrientationPackage;
import com.rnfs.RNFSPackage;
import com.RNFetchBlob.RNFetchBlobPackage;
import com.rnziparchive.RNZipArchivePackage;
import com.oblador.vectoricons.VectorIconsPackage;
import com.futurepress.staticserver.FPStaticServerPackage;
import com.github.yamill.orientation.OrientationPackage;
import com.rnfs.RNFSPackage;
import com.RNFetchBlob.RNFetchBlobPackage;
import com.rnziparchive.RNZipArchivePackage;
import com.oblador.vectoricons.VectorIconsPackage;
import com.futurepress.staticserver.FPStaticServerPackage;
import com.github.yamill.orientation.OrientationPackage;
import com.rnfs.RNFSPackage;
import com.RNFetchBlob.RNFetchBlobPackage;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.facebook.react.shell.MainReactPackage;
import com.facebook.soloader.SoLoader;

import java.util.Arrays;
import java.util.List;

public class MainApplication extends Application implements ReactApplication {

  private final ReactNativeHost mReactNativeHost = new ReactNativeHost(this) {
    @Override
    public boolean getUseDeveloperSupport() {
      return BuildConfig.DEBUG;
    }

    @Override
    protected List<ReactPackage> getPackages() {
      return Arrays.<ReactPackage>asList(
          new MainReactPackage(),
            new RNZipArchivePackage(),
            new VectorIconsPackage(),
            new FPStaticServerPackage(),
            new OrientationPackage(),
            new RNFSPackage(),
            new RNFetchBlobPackage(),
            new RNZipArchivePackage(),
            new VectorIconsPackage(),
            new FPStaticServerPackage(),
            new OrientationPackage(),
            new RNFSPackage(),
            new RNFetchBlobPackage()
      );
    }

    @Override
    protected String getJSMainModuleName() {
      return "index";
    }
  };

  @Override
  public ReactNativeHost getReactNativeHost() {
    return mReactNativeHost;
  }

  @Override
  public void onCreate() {
    super.onCreate();
    SoLoader.init(this, /* native exopackage */ false);
  }
}
