angular.module('starter.config', [])

  .constant('config', {
    appName: 'My App',
    appVersion: 2.0,
  //  restEndpoint: 'http://10.0.3.2:8080/D2-REST',

    restEndpoint: 'http://localhost:8080/D2-REST',
   // This is local machine ip restEndpoint: 'http://10.30.93.22:8080/D2-REST',

    repository: 'repo1',
    acsServerName: 'exptm.dctmnow.com',
    //acsServerIP: '192.168.107.129',
    acsServerIP: '10.31.160.156',
    deviceStore: '/storage/emulated/0/Download/'

});
