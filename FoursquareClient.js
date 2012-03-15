if (typeof define !== 'function') { var define = (require('amdefine'))(module); }

define([
  "compose",
  "./Client",
  "promised-io/request",
  "promised-io/lib/adapters!http"
], function(Compose, Client, request, http){
  return Client.extend({
    _normalizedAuthorizationEndpoint: {
      protocol: "https:",
      hostname: "foursquare.com",
      port: 443,
      pathname: "/oauth2/authenticate"
    },
    _normalizedTokenEndpoint: {
      protocol: "https:",
      hostname: "foursquare.com",
      port: 443,
      pathname: "/oauth2/access_token"
    },

    bearer: function(access_token){
      var checkBearerErrors = this._checkBearerErrors;
      return {
        request: function(kwargs){
          var options = http.normalizeOptions(kwargs);
          if(options.query){
            options.query += "&oauth_token=" + access_token;
          }else{
            options.query = "oauth_token=" + access_token;
          }
          return request(options).then(checkBearerErrors);
        }
      };
    }
  });
});
