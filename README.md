
### Feature 
* Support flutter logger navigator to line position in debug console 
    * Convert the package path to absolute path and then you cant tap and fast to debug the code 
* dependency on flutter package
    - more feature => [color_logging](https://pub.dev/packages/color_logging)
    - more feature => [color_observer_logger](https://pub.dev/packages/color_observer_logger)

#### color_logging
* without extension
![](./image/logger/color_looger_bad1.png)
* with extension you can tap absolute path to code line
![](./image/logger/color_looger_good1.png)



#### color_observer_logger
* without extension
![](./image/logger/obs_logger_bad.png)
* with extension you can tap absolute path to code line
![](./image/logger/obs_logger_good.png)


### Multi-level Workspace Support

This extension now supports multi-level workspace structures, handling complex project organizations:

* Use `customPrefix` setting to specify custom path prefixes
* Support for Git package dependencies with automatic relative path handling
* Correctly resolve package paths in different workspace levels

#### Configuration

In VSCode settings, you can configure `FlutterLoggerEasyLife.customPrefix` to specify a custom path prefix:

* Global settings: Applied to all projects
* Workspace settings: Applied only to the current workspace, takes precedence over global settings

This enables correct code navigation in multi-level project structures.

#### Project Structure Example

```
foo
├── .vscode/settings.json
├── flutterProject
└── flutterProject2
```

* support example/
```
flutterPackageProject
├── .vscode/settings.json
├── example/
└── lib/
└── pubspec.yaml
```

#### Settings Example

```json
// If run subfolder project add this
// .vscode/settings.json
{
    "FlutterLoggerEasyLife.customPrefix": "./"
}
```

💡 Set up your workspace like this:
* Open the foo directory as the VSCode root.
* Run your Flutter project from a subfolder (e.g., flutterProject/).
* Set "./" as the customPrefix in your settings.
    * This instructs the extension to treat "../" as referring to the correct subproject directory (e.g., ./flutterProject).
    * For example, an import like ../common/logger.dart will be correctly resolved as ./flutterProject/common/logger.dart, depending on your folder structure.


#### If help you, please give me a star. Thanks you so much