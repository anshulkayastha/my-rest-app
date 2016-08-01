angular.module('starter.services', [])

  .factory('D2RestService', function ($http, config, $q) {
    var headers = {};
    var username = "";
    var password = "";

    function setUsername(username) {
      this.username = username;
    }

    function setPassword(password) {
      this.password = password;
    }

    function getUsername() {
      return this.username;
    }

    function getPassword() {
      return this.password;
    }

    function setAuthHeaders(username, password) {
      var auth = btoa(username + ":" + password);
      headers = {
        'Authorization': 'Basic ' + auth,
        'Content-Type': 'application/vnd.emc.documentum+json',
        'Accept': 'application/vnd.emc.documentum+json'
        //  'X-Access-Token': uuid
      }
    }

    function callRestService(url) {
      return $http.get(config.restEndpoint + '/repositories/' + url, {
        headers: headers
      })
    }

    function getMetadata(docs) {
      var context = this;
      return $q.all(
        docs.map(function(metadata) {
          return metadata.content.properties.r_object_id;
        }).map(function(objectID) {
          return context.callRestService(config.repository + '/objects/' + objectID + '/contents/content?inline=true');
        })
      ).then(function(results) {
          //get data part of of $http service
          return results.map(function(result) {
            return result.data;
          });
        });
    }

    return {
      setAuthHeaders: setAuthHeaders,
      callRestService: callRestService,
      getUsername: getUsername,
      getPassword: getPassword,
      setUsername: setUsername,
      setPassword: setPassword,
      getMetadata: getMetadata
    }

  })


;
