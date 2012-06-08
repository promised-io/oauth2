if (typeof define !== 'function') { var define = (require('amdefine'))(module); }

define([
  "compose",
  "./_errors",
  "promised-io/request",
  "promised-io/lib/adapters!lang",
  "promised-io/lib/adapters!http"
], function(Compose, errors, request, lang, http){
  "use strict";

  var ERROR_MAP = {
    invalid_request: errors.InvalidRequest,
    invalid_client: errors.InvalidClient,
    invalid_grant: errors.InvalidGrant,
    invalid_token: errors.InvalidToken,
    invalid_scope: errors.InvalidScope,
    insufficient_scope: errors.InsufficientScope,

    unauthorized_client: errors.UnauthorizedClient,

    unsupported_grant_type: errors.UnsupportedGrantType,
    unsupported_response_type: errors.UnsupportedResponseType,

    acces_denied: errors.AccesDenied,
    server_error: errors.ServerError,
    temporarily_unavailable: errors.TemporarilyUnavailable
  };

  var TEST_JSON_TYPE = /^application\/json(;|$)/;
  var SPLIT_AUTHENTICATE_TOKENS = /(,|\u0020|=|")/;

  function extractScheme(scheme, field){
    var params = {};
    var hasScheme = false;

    var tokens = lang.filter(field.split(SPLIT_AUTHENTICATE_TOKENS), lang.identity);
    for(var i = 0, l = tokens.length, p, v; i < l; i++){
      if(tokens[i] === scheme){
        // Ignore repeated schemes.
        if(hasScheme){
          break;
        }
        hasScheme = true;
        i++; // Skip space
        continue;
      }

      if(!hasScheme){
        continue;
      }

      if(p){
        // Bail if the param has no value, it's likely a new scheme.
        if(tokens[i] !== "="){
          break;
        }

        if(tokens[++i] === "\""){
          v = "";
          for(i++; i < l; i++){
            if(tokens[i] === "\""){
              // FIXME: Unescape octets
              params[p] = v;
              p = v = null;
              break;
            }else{
              v += tokens[i];
            }
          }
        }else{
          // FIXME: Unescape octets
          params[p] = tokens[i];
          p = null;
        }
      }else if(tokens[i] !== "," && tokens[i] !== " "){
        p = tokens[i];
      }
    }

    return hasScheme ? params : null;
  }

  // TODO: follow redirect in oauth flow calls
  // TODO: refresh token
  // TODO: Unescape WWW-Authenticat evalues
  // TODO: tests

  return Compose(function(options){
    this.id = options.id;
    this.secret = options.secret;
    this.redirect_uri = options.redirect_uri;
    if(options.clientAuthInBody === true){
      this.clientAuthInBody = true;
    }

    if(options.authorizationEndpoint){
      this._normalizedAuthorizationEndpoint = http.normalizeOptions(options.authorizationEndpoint);
    }
    if(options.tokenEndpoint){
      this._normalizedTokenEndpoint = http.normalizeOptions(options.tokenEndpoint);
    }
  }, {
    id: null,
    secret: null,
    redirect_uri: null,
    headers: null,
    clientAuthInBody: false,
    _normalizedAuthorizationEndpoint: null,
    _normalizedTokenEndpoint: null,

    _resolveEndpoint: function(endpoint, query){
      endpoint = http.normalizeOptions(endpoint);
      if(query){
        if(endpoint.query){
          endpoint.query += "&" + query;
        }else{
          endpoint.query = query;
        }
      }
      return endpoint;
    },

    _checkBearerErrors: function(response){
      var authenticate = response.headers["www-authenticate"];
      if(!authenticate){
        return response;
      }

      var scheme = extractScheme("Bearer", authenticate);
      if(!scheme){
        return response;
      }

      if(scheme.error){
        var error;
        if(ERROR_MAP.hasOwnProperty(scheme.error)){
          error = new ERROR_MAP[scheme.error](scheme.error_description);
        }else{
          error = new errors.OAuthError(scheme.error_description);
          error.error = scheme.error;
        }
        error.realm = scheme.realm;
        error.uri = scheme.error_uri;
        error.status = response.status;
        error.body = response.body.join("");
        throw error;
      }

      return response;
    },

    parseRedirect: function(component){
      if(typeof component === "string"){
        component = lang.parseForm(component);
      }

      if(component.error){
        var error;
        if(ERROR_MAP.hasOwnProperty(component.error)){
          error = new ERROR_MAP[component.error](component.error_description);
        }else{
          error = new errors.OAuthError(component.error_description);
          error.error = component.error;
        }
        error.uri = component.error_uri;
        if(component.state){
          error.state = component.state;
        }
        return error;
      }

      var result = {};
      if("state" in component){
        result.state = component.state;
      }

      if("code" in component){
        result.code = component.code;
      }else if("access_token" in component){
        result.access_token = component.access_token;
        result.token_type = component.token_type;
        result.expires_in = component.expires_in;
        if(result.expires_in){
          result.expires_at = new Date(lang.now() + result.expires_in * 1000);
        }
        result.scope = component.scope;
      }
      return result;
    },

    constructAuthorizationHref: function(kwargs){
      var queryArgs = ["client_id=" + encodeURIComponent(this.id)];
      if(kwargs.response_type){
        queryArgs.push("response_type=" + encodeURIComponent(kwargs.response_type));
      }
      if(kwargs.redirect_uri || this.redirect_uri){
        queryArgs.push("redirect_uri=" + encodeURIComponent(kwargs.redirect_uri || this.redirect_uri));
      }
      if(kwargs.scope){
        if(lang.isArray(kwargs.scope)){
          queryArgs.push("scope=" + encodeURIComponent(kwargs.scope.join(" ")));
        }else{
          queryArgs.push("scope=" + encodeURIComponent(kwargs.scope));
        }
      }
      if(kwargs.state){
        queryArgs.push("state=" + encodeURIComponent(kwargs.state));
      }

      var endpoint = this._resolveEndpoint(kwargs.endpoint || this._normalizedAuthorizationEndpoint, queryArgs.join("&"));
      return http.formatHref(endpoint);
    },

    requestAccessToken: function(kwargs){
      var form = {
        grant_type: kwargs.grant_type
      };
      switch(form.grant_type){
        case "authorization_code":
          form.code = kwargs.code;
          if("redirect_uri" in kwargs || this.redirect_uri){
            form.redirect_uri = kwargs.redirect_uri || this.redirect_uri;
          }
          break;
        case "password":
          form.username = kwargs.username;
          form.password = kwargs.password;
          if("scope" in kwargs){
            form.scope = kwargs.scope;
          }
          break;
        case "client_credentials":
          if("scope" in kwargs){
            form.scope = kwargs.scope;
          }
          break;
      }

      if(form.scope && lang.isArray(form.scope)){
        form.scope = form.scope(" ");
      }

      var endpoint = this._resolveEndpoint(kwargs.endpoint || this._normalizedTokenEndpoint);
      endpoint.method = "POST";
      endpoint.headers["accept"] = "application/json";
      endpoint.form = form;

      if(kwargs.setAuthorization){
        kwargs.setAuthorization(this, endpoint);
      }else if(this.secret){
        if(!this.clientAuthInBody){
          endpoint.auth = this.id + ":" + this.secret;
        }else{
          endpoint.form.client_id = this.id;
          endpoint.form.client_secret = this.secret;
        }
      }

      return request(endpoint).then(function(response){
        function jsonParseError(rawError){
          var error = new errors.OAuthError("Failed to receive or parse JSON body");
          error.status = response.status;
          error.contentType = response.headers["content-type"];
          error.rawError = rawError;
          throw error;
        }

        if(response.status === 200){
          var credentials = kwargs.extractCredentials ? kwargs.extractCredentials(response) : response.body.parseJSON().fail(jsonParseError);
          return credentials.then(function(credentials){
            if(credentials.expires_in){
              credentials.expires_at = new Date(lang.now() + credentials.expires_in * 1000);
            }
            return credentials;
          });
        }

        if(TEST_JSON_TYPE.test(response.headers["content-type"])){
          return response.body.parseJSON().then(function(json){
            var error;
            if(ERROR_MAP.hasOwnProperty(json.error)){
              error = new ERROR_MAP[json.error](json.error_description);
            }else{
              error = new errors.OAuthError(json.error_description);
              error.error = json.error;
            }
            error.uri = json.error_uri;
            error.status = response.status;
            error.json = json;
            throw error;
          }, jsonParseError);
        }

        var error = new errors.OAuthError("Unexpected response from token endpoint.");
        error.status = response.status;
        error.body = response.body.join("");
        throw error;
      });
    },

    request: function(kwargs){
      var options = http.normalizeOptions(kwargs);
      if(this.secret){
        if(!this.clientAuthInBody){
          options.auth = this.id + ":" + this.secret;
        }else if(options.form){
          options.form.client_id = this.id;
          options.form.client_secret = this.secret;
        }
      }
      return request(options);
    },

    bearer: function(access_token){
      var checkBearerErrors = this._checkBearerErrors;
      return {
        request: function(kwargs){
          var options = http.normalizeOptions(kwargs);
          options.headers.authorization = "Bearer " + access_token;
          return request(options).then(checkBearerErrors);
        }
      };
    }
  });
});
