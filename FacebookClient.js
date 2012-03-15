if (typeof define !== 'function') { var define = (require('amdefine'))(module); }

define([
  "compose",
  "./Client",
  "promised-io/request",
  "promised-io/lib/adapters!http"
], function(Compose, Client, request, http){
  return Client.extend({
    clientAuthInBody: true,

    _normalizedAuthorizationEndpoint: {
      protocol: "https:",
      hostname: "www.facebook.com",
      port: 443,
      pathname: "/dialog/oauth"
    },
    _normalizedTokenEndpoint: {
      protocol: "https:",
      hostname: "graph.facebook.com",
      port: 443,
      pathname: "/oauth/access_token"
    },

    _extractFacebookCredentials: function(response){
      return response.body.parseForm();
    },
    
    requestAccessToken: Compose.before(function(kwargs){
      kwargs.extractCredentials = this._extractFacebookCredentials;
    }),

    bearer: function(access_token){
      var checkBearerErrors = this._checkBearerErrors;
      return {
        request: function(kwargs){
          var options = http.normalizeOptions(kwargs);
          if(options.query){
            options.query += "&access_token=" + access_token;
          }else{
            options.query = "access_token=" + access_token;
          }
          return request(options).then(checkBearerErrors);
        }
      };
    }
  });
});
