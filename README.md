
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



### How to support when debug the TestPackage/example/lib/main.dart

* Do not import all package project
    * ![](./image/logger/bad.png)

* Just import example 
    *  ![](./image/logger/good.png)



#### If help you, please give me a star. Thanks you so much