angular.module('starter.controllers', ['ngFileUpload'])

  .controller('DocListCtrl', function ($scope, $http, config, D2RestService) {

    $scope.searchValue = "0c00000180000106";

    $scope.getDocumentList = function () {
      console.log("USername in document list controller - " + D2RestService.getUsername());
      D2RestService.setAuthHeaders(D2RestService.getUsername(), D2RestService.getPassword());
      /*  var requestPayload = {
       login: "dmadmin",
       //uid: UID,
       folder_id: ""
       };*/
      D2RestService.callRestService(config.repository + "/folders/" + $scope.searchValue + "/documents?inline=true")

        .then(function (searchResults) {
          $scope.items = searchResults.data;
          console.log("Search results " + searchResults.data);
        })
        .catch(function (errorObj) {
          console.error("Search failed: ", errorObj)
          $scope.items = errorObj;
        });
    }
  })

  .controller('UploadPicCtrl', function ($scope, $http, $cordovaDevice, $ionicPlatform, $cordovaCamera, D2RestService, config) {
    $scope.pictureUrl = "http://placehold.it/300x300";


    $scope.takePicture = function () {
      console.log("Take picture clicked ");
      var options = {
        destinationType: Camera.DestinationType.FILE_URI,
        encodingType: Camera.EncodingType.JPEG
      }
      $cordovaCamera.getPicture(options)
        .then(function (data) {
          $scope.pictureUrl = data;
          var date = new Date();
          var filePath = data;

          /*     var options = {
           fileKey: "file",
           fileName: data.substr(data.lastIndexOf('/') + 1),
           chunkedMode: false,
           mimeType: "image/jpg",

           };
           */
          uploadPhoto(data);


        }, function (error) {
          console.log('camera error ' + error);
        });

    }, function (err) {
      console.log("Error " + err);
    };


    function uploadPhoto(imageURI) {
      var authHeaderValue = function (username, password) {
        var tok = username + ':' + password;
        var hash = btoa(tok);
        return "Basic " + hash;
      };
      console.log('authHeadersset');
      var options = new FileUploadOptions();
      options.fileKey = "content";
      options.fileName = imageURI.substr(imageURI.lastIndexOf('/') + 1);
      options.mimeType = "image/jpeg";


      options.chunkedMode = false;

      var params = {
        "object": {
          "properties": {
            "r_object_type": "dm_document",
            "object_name": "MyPic.JPG",
            "a_content_type": "jpeg"
          }
        }
      };
      options.params = params;


      options.headers = {
        'Authorization': authHeaderValue(D2RestService.getUsername(), D2RestService.getPassword())

      };
      console.log('Before create file transfer object');
      var ft = new FileTransfer();
      ft.upload(imageURI, encodeURI(config.restEndpoint + "/repositories/" + config.repository + "/object-creation"), win, fail, options);
    }

    function win(r) {
      console.log("Code = " + r.responseCode);
      console.log("Response = " + r.response);
      console.log("Sent = " + r.bytesSent);
      console.log(r);
      alert(r.response);
    }

    function fail(error) {
      alert("An error has occurred: Code = " + error.code);
      console.log(error);
    }

  })
  .controller('LoginCtrl', function ($scope, $http, $state, config, D2RestService) {
    $scope.user = {
      username: 'dmadmin',
      password: 'D3m04doc!',
      repository: 'repo1'
    }

    $scope.login = function () {
      D2RestService.setAuthHeaders($scope.user.username, $scope.user.password);
      D2RestService.callRestService(config.repository + '.json')
        .then(function (response) {
          console.log("Login Successful: " + response.statusText);
          D2RestService.setUsername($scope.user.username);
          D2RestService.setPassword($scope.user.password);
          $state.go('tab.docList');
        }, function (error) {
          console.log("ERROR during Login: " + error.toString());
        });
    }
  })

  .controller('UploadDocCtrl', function ($scope, $http, $cordovaFileTransfer, config, D2RestService) {

    $scope.uploadme = function () {

      var restServiceEndpoint = config.restEndpoint + '/repositories/' + config.repository + '/object-creation';
      var fd = new FormData();
      fd.append("file", fileURI);


      $http.post(url, fd, {
        withCredentials: false,
        headers: {
          'Content-Type': undefined
        },
        transformRequest: angular.identity
      })
        .success(function (data) {
          success('Upload successful! - ' + data);
        })
        .error(function (data) {
          alert('Response Error: Check your Internet Connection - ' + data);
        });


    }
  })
  .controller('SyncDocsCtrl', function ($scope, $http, $cordovaFileTransfer, $ionicFilterBar, $ionicLoading, D2RestService, config, $cordovaToast) {

    // for local VM - $scope.searchValue = "0b00000180088b44";
    $scope.searchValue = "0b0000018009a497";
    $scope.documentList = [];
    var search = $scope.search = {};
    var docsToSync;

    //show loading bar
    $ionicLoading.show({
      template: 'Loading documents'
    });
    //get contents of folder
    D2RestService.callRestService(config.repository + '/folders/' + $scope.searchValue + '/documents?inline=true')
      .then(function (result) {
        //extract data field from result
        return result.data;
      }).then(function (data) {

        if (data.length === 0) {
          //if there is no content
          console.log('No documents available for sync.');
        } else {
          $scope.documentList = data.entries;
        }

      }).catch(function (err) {
        console.log('Error occured in getting document. Try again later!');
        console.error('Error in getting documents :- ' + JSON.stringify(err));
      }).then(function () {
        //work as finally, this hides loading bar
        return $ionicLoading.hide();
      });

    //conditionally show/hide Sync button
    $scope.testIfSync = function testIfSync() {
      var flag = $scope.documentList.some(function (val) {
        return val.isSyncRequired;
      });

      if (flag) {
        $scope.syncButton = true; // show the button
      } else {
        $scope.syncButton = false; // hide the button
      }
    }

    $scope.syncDocs = function () {
      console.log('download document function called');

      docsToSync = $scope.documentList.filter(function (val) {
        console.log('documentList.filter - ' + val);
        return (val.isSyncRequired === true);
      });

      D2RestService.getMetadata(docsToSync)
        .then(function (data) {
          var dataLink = extractContentMediaLinks(data);
          console.log('Data Link - ' + dataLink);
          return dataLink;

        }).then(function (dataLink) {
          //return FileAPI.saveFile(cordova.file.externalApplicationStorageDirectory,syncDocs,downloadUrls);
          console.log('Download URLS ' + dataLink);

          for (var i = 0; i < dataLink.length; i++) {
            var fileName = dataLink[i].objectName;
            //fileName = fileName + dataLink.dosExtension;
            //  window.resolveLocalFileSystemURL(config.deviceStore + fileName, appStart, downloadAsset);
            downloadAsset(fileName, dataLink[i].acsUrl)
          }

        })
      /*   .then(function (result) {
       console.log('Files successfully synced! ' + result);
       }).catch(function (err) {
       console.log("Error in syncing " + JSON.stringify(err));
       });
       */


      //I'm only called when the file exists or has been downloaded.
      function appStart() {
        console.log('File already exists!');
      }

      function downloadAsset(fileName, assetURL) {
        var fileTransfer = new FileTransfer();
        console.log("About to start transfer");
        var store = config.deviceStore;

        // var assetURL = "http://192.168.107.129:9080/ACS/servlet/ACS?command=read&version=2.3&docbaseid=000001&basepath=C%3A%5CDocumentum%5Cdata%5Crepo1%5Ccontent_storage_01%5C00000001&filepath=80%5C04%5Ca7%5C50.pdf&objectid=0900000180080d15&cacheid=dAAEAgA%3D%3DUKcEgA%3D%3D&format=pdf&pagenum=0&signature=IDYrYRiWU0zw810NNJlv5%2BepCh8Q66osu111iYTki4nxB%2FhwydpHPR7ak81zE9dGA%2F%2F8uaaOf3UfyXWXyP8IPIrloaV9HLjnX8Ei8hVDK3sWa7j9XjR1M9cZx1OC2OBbjHDW%2BlWQX2gxDHSrMi21fT0RuMfFZFDN4dpy0pe%2F9M4%3D&servername=EXPTMACS1&mode=1&timestamp=1468663567&length=1488091&mime_type=application%2Fpdf&parallel_streaming=true&expire_delta=360";
        var fileURL = store + fileName; //contains a valid URL to a path on the device
        console.log('About to transfer file to : ' + fileURL);

        fileTransfer.download(assetURL, store + fileName,
          function (entry) {
            console.log("Success! " + entry.toURL());
            // $cordovaToast.show('Files synced successfully');
            //      appStart();
          },
          function (err) {
            console.log("Error");
            console.dir(err);
          });
      }

      var extractContentMediaLinks = function extract(data) {

        var docDetailsArray = [];

        for (var i = 0; i < data.length; i++) {
          var docDetails = {};
          var acsUrl = data[i].links.filter(function (value) {
            return value.rel === 'http://identifiers.emc.com/linkrel/content-media';
          })[0].href;
          acsUrl = acsUrl.replace(config.acsServerName, config.acsServerIP);

          var properties = data[i].properties;
          var objectName = properties.object_name;
          var objectId = properties.r_object_id;
          var fullFormat = properties.full_format;
          var format = properties.format_name;
          var mimeType = properties.mime_type;
          var dosExtension = properties.dos_extension;

          console.log('Object Name - ' + objectName + ' Dos extension - ' + dosExtension);

          if (!(objectName.match(dosExtension + "$") == dosExtension)) {
            objectName = objectName + '.' + dosExtension;
          }

          docDetails = {
            acsUrl: acsUrl,
            objectName: objectName,
            format: format,
            objectId: objectId,
            fullFormat: fullFormat,
            mimeType: mimeType,
            dosExtension: dosExtension
          }
          console.log('DocDetails - ' + docDetails);

          docDetailsArray.push(docDetails);
        }

        console.log('MediaLinks - ' + docDetailsArray);
        return docDetailsArray;
      }
    };

    $scope.showFilterBar = function () {
      filterBarInstance = $ionicFilterBar.show({
        items: $scope.documentList,
        update: function (filteredItems) {
          $scope.documentList = filteredItems;
        },
        filterProperties: 'title'
      });
    }

  })


  .controller('MapsCtrl', function ($scope, $http, $cordovaFileTransfer, D2RestService, config) {

    console.log('Maps Controller');
    $scope.coordinates = {
      address: '',
      latitude: '46.414382',
      longitude: '10.013988'
    }
    $scope.getMap = function () {
      if (typeof $scope.address !== 'undefined') {
        console.log('Found address');// use address to find longitude and latitude

      } else { // use longitude & latitude
        $scope.mapUrl = 'https://maps.googleapis.com/maps/api/streetview?size=600x300&location=' + $scope.coordinates.latitude + ',' + $scope.coordinates.longitude + '&heading=151.78&pitch=-0.76&key=AIzaSyD4YDBoacmwHQoQ4yyDAjjJrT2qby7X-Gg';
      }
    }
  })
  .controller('PlotCtrl', function ($scope, $http, $cordovaFileTransfer, D2RestService, config, $cordovaGeolocation) {

    console.log('Plot Controller');

  })

;


