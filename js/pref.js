function PttChromePref(app, onInitializedCallback) {
  this.values = {};
  this.logins = null;
  this.app = app;
  this.shouldResetToDefault = false;

  this.enableBlacklist = false;
  this.blacklistedUserIds = {};

  //this.loadDefault(onInitializedCallback);
  this.onInitializedCallback = onInitializedCallback;
  this.initCallbackCalled = false;
}

PttChromePref.prototype = {

  updateSettingsToUi: function() {
    this.refreshBlacklistOnUi();

    var self = this;
    var htmlStr = '';
    var n = 0;
    var onMouseBrowsingHighlightColorChange = function(e) {
      var qName = '#opt_mouseBrowsingHighlightColor';
      var val = $(qName+' select').val();
      var bg = $(qName+' .b'+val).css('background-color');
      $(qName+' select').css('background-color', bg);
    };

    for (var i in this.values) {
      $('#opt_'+i).empty();
      var val = this.values[i];

      // for blacklisted userids
      if (i === 'blacklistedUserIds') {
        continue;
      }
      
      // for the color selection box
      if (i === 'mouseBrowsingHighlightColor') {
        var qName = '#opt_'+i;
        htmlStr = i18n('options_highlightColor')+'<select class="form-control">';
        for (n = 1; n < 16; ++n) {
          htmlStr += '<option value="'+n+'" class="b'+n+'"></option>';
        }
        htmlStr += '</select>';
        $(qName).html(htmlStr);
        $(qName+' select').val(val);
        var bg = $(qName+' .b'+val).css('background-color');
        $(qName+' select').css('background-color', bg);
        $(qName+' select').on('change', onMouseBrowsingHighlightColorChange);
        continue;
      }

      // for options that's predefined
      if (i in PREF_OPTIONS) {
        var optName = '#opt_'+i;
        htmlStr = i18n('options_'+i) + '<select class="form-control">';
        var options = PREF_OPTIONS[i];
        for (n = 0; n < options.length; ++n) {
          htmlStr += '<option value="'+n+'">'+i18n(options[n])+'</option>';
        }
        htmlStr += '</select>';
        $(optName).html(htmlStr);
        $(optName+' select').val(val);

        continue;
      }

      switch(typeof(val)) {
        case 'number':
          $('#opt_'+i).html(
            '<label style="font-weight:normal;">'+i18n('options_'+i)+'</label>'+
            '<input type="number" class="form-control" value="'+val+'">');
          break;
        case 'string':
          $('#opt_'+i).html(
            '<label style="font-weight:normal;">'+i18n('options_'+i)+'</label>'+
            '<input type="text" class="form-control" value="'+val+'">');
          break;
        case 'boolean':
          $('#opt_'+i).html(
            '<label><input type="checkbox" '+(val?'checked':'')+'>'+i18n('options_'+i)+'</label>');
          break;
        default:
          break;
      }
    }
    // autologin
    $('#login_username').html(
      '<label style="font-weight:normal;">'+i18n('autologin_username')+'</label>'+
      '<input type="text" class="form-control" value="'+this.logins[0]+'">');
    $('#login_password').html(
      '<label style="font-weight:normal;">'+i18n('autologin_password')+'</label>'+
      '<input type="password" class="form-control" value="'+this.logins[1]+'">');
  },

  setupSettingsUi: function() {
    var self = this;
    var i;
    $('#opt_title').text(i18n('menu_settings'));

    $('#opt_reset').off();
    $('#opt_reset').text(i18n('options_reset'));
    $('#opt_reset').click(function() {
      self.shouldResetToDefault = true;
      $('#prefModal').modal('hide');
    });
    // adjust the size alittle according to the locale
    var lang = getLang();
    if (lang == 'en_US') {
      $('#opt_reset').css('fontSize', '12px');
      $('#opt_reset').css('marginLeft', '-10px');
    }

    var cat = '';
    for (i in PREFS_CATEGORIES) {
      cat = PREFS_CATEGORIES[i];
      $('#opt_'+cat).text(i18n('options_'+cat));
    }
    for (i in PREFS_NAV) {
      cat = PREFS_NAV[i];
      $('#optNav_'+cat).text(i18n('options_'+cat));
    }

    $('#opt_tabs a:first').tab('show');
    var currTab = 'general';
    $('#modalHeader').text(i18n('options_'+currTab));

    $('#opt_autologinWarning').text(i18n('autologin_warning'));

    // blacklist
    $('#opt_blacklistInstruction').text(i18n('options_blacklistInstruction'));

    this.setupAboutPage();
    
    $('#opt_tabs a').click(function(e) {
      e.preventDefault();

      var currTab = $(this).attr('name');
      $('#modalHeader').text(i18n('options_'+currTab));
      $(this).tab('show');
    });

    $('#blacklist_driveLoad').click(function(e) {
      listFilesInApplicationDataFolder(function(results) {
        for (var r in results) {
          var result = results[r];
          downloadFile(result, function(content) {
            if (content) console.log(content);
            else console.log('no content');
          });
        }
      });
    });
    $('#blacklist_driveSave').click(function(e) {
      insertFileInApplicationDataFolder('test', function(result) {
        printFile(result.id);
      });
    });

  },

  populateSettingsToUi: function() {
    var self = this;
    this.setupSettingsUi();
    this.updateSettingsToUi();

    $('#prefModal').off();
    $('#prefModal').on('show.bs.modal', function(e) {
      var width = document.documentElement.clientWidth * 0.7;
      width = (width > 730) ? width : 730;
      width -= 190;
      var height = document.documentElement.clientHeight * 0.9;
      height = (height > 400) ? height: 400;
      height -= 76;
      $('#prefModal .modal-body').css('height', height + 'px');
      $('#prefModal .modal-body').css('width', width + 'px');
      $('#opt_blacklistedUsers').css('height', height-150 + 'px');
      self.refreshBlacklistOnUi();
    });
    $('#prefModal').on('shown.bs.modal', function(e) {
      self.app.modalShown = true;
    });
    $('#prefModal').on('hidden.bs.modal', function(e) {
      if (self.shouldResetToDefault) {
        self.clearStorage();
        self.values = JSON.parse(JSON.stringify(DEFAULT_PREFS));
        self.blacklistedUserIds = {};
        self.logins = ['',''];
        self.updateSettingsToUi();
        self.app.view.redraw(true);

        self.shouldResetToDefault = false;
      } else {
        self.readValueFromUi();
      }
      self.saveAndDoneWithIt();
    });
  },

  setupAboutPage: function() {
    var contents = [
        'review', 'feedback', 'fbpage', 
        'promote',
        'version_title', 'version',
        'new_title'
      ];
    for (var i in contents) {
      var content = contents[i];
      $('#about_'+content).text(i18n('about_'+content));
    }

    var whatsNewListHtml = '<li>' + i18n('about_new_content').join('</li><li>') + '</li>';
    $('#about_new').html(whatsNewListHtml);
  },

  refreshBlacklistOnUi: function() {
    var listNode = $('#opt_blacklistedUsers');
    var listStr = Object.keys(this.blacklistedUserIds).join('\n');
    listNode.val(listStr);
  },

  readBlacklistValues: function() {
    var listNode = $('#opt_blacklistedUsers');
    var listStr = listNode.val();
    var blacklistArray = listStr.split('\n');

    this.blacklistedUserIds = {};

    for (var i in blacklistArray) {
      var b = blacklistArray[i];
      if (!b) continue;
      this.blacklistedUserIds[b.toLowerCase()] = true;
    }
    this.setBlacklistValue();
    this.app.view.redraw(true);
  },

  saveAndDoneWithIt: function() {
    var self = this;
    var data = {
      values: self.values,
      logins: {'u':self.logins[0], 'p':self.logins[1]}
    };
    this.setStorage(data);
    this.updateToApp();
    this.app.modalShown = false;
    this.app.setInputAreaFocus();
  },

  readValueFromUi: function() {
    this.readBlacklistValues();
    var selectedVal;
    for (var i in this.values) {
      if (i === 'blacklistedUserIds') {
        continue;
      }

      if (i === 'mouseBrowsingHighlightColor') {
        selectedVal = $('#opt_'+i+' select').val();
        this.values[i] = parseInt(selectedVal);
        continue;
      }

      if (i in PREF_OPTIONS) {
        selectedVal = $('#opt_'+i+' select').val();
        this.values[i] = parseInt(selectedVal);
        continue;
      }

      var elem = $('#opt_'+i+' input');
      var type = typeof(this.values[i]);
      switch(type) {
        case 'number':
          this.values[i] = parseInt(elem.val());
          break;
        case 'string':
          this.values[i] = elem.val();
          break;
        case 'boolean':
          this.values[i] = elem.prop('checked');
          break;
        default:
          break;
      }
    }
    var user = $('#login_username input').val();
    var pswd = $('#login_password input').val();
    if (user === '') {
      pswd = '';
    }
    this.logins = [user, pswd];
  },

  loadDefault: function(callback) {
    this.values = JSON.parse(JSON.stringify(DEFAULT_PREFS));
    this.logins = {'u':'', 'p':''};
    this.updateToApp();
    this.populateSettingsToUi();
    callback();
  },

  updateToApp: function() {
    for (var i in this.values) {
      this.app.onPrefChange(this, i);
    }
    if (this.logins[0]) {
      this.app.conn.loginStr[1] = this.logins[0];
    }
    if (this.logins[1]) {
      this.app.conn.loginStr[2] = this.logins[1];
    }
  },

  resetSettings: function() {
    this.clearStorage();
    this.getStorage();
  },

  get: function(prefName) {
    console.log(prefName + " = " + this.values[prefName]);
    return this.values[prefName];
  },

  set: function(prefName, value) {
    this.values[prefName] = value;
  },

  onStorageDone: function(msg) {
    if (msg.data && msg.data.values) {
      // iterate through default prefs to make sure all up to date
      for (var i in DEFAULT_PREFS) {
        if (!(i in msg.data.values) || msg.data.values[i] === null) {
          this.values[i] = DEFAULT_PREFS[i];
        } else {
          if (i === 'blacklistedUserIds') {
            this.blacklistedUserIds = JSON.parse(msg.data.values[i]);
          } else {
            this.values[i] = msg.data.values[i];
          }
        }
      }
    }
    if (msg.data && msg.data.logins) {
      var data = msg.data.logins;
      this.logins = [data.u, data.p];
    }
    this.updateToApp();
    this.populateSettingsToUi();
    if (!this.initCallbackCalled) {
      if (this.values !== null && this.logins !== null) {
        this.initCallbackCalled = true;
        this.onInitializedCallback(this.app);
      }
    }
  },

  getStorage: function(key) {
    if (this.app.appConn.isConnected) {
      this.app.appConn.appPort.postMessage({ action: 'storage', type: 'get', defaults: {
        values: DEFAULT_PREFS,
        logins: {'u':'', 'p':''}
      } });
    }
  },

  setBlacklistValue: function() {
    var blacklist = JSON.stringify(this.blacklistedUserIds);
    this.values.blacklistedUserIds = blacklist;
  },

  syncBlacklistWithDriveApi: function() {
    // use the Drive API to sync the blacklist data

  },

  setBlacklistStorage: function() {
    if (this.app.appConn.isConnected) {
      var items = { 
        values: {
          blacklistedUserIds: this.values.blacklistedUserIds
        }
      };
      this.app.appConn.appPort.postMessage({ action: 'storage', type: 'set', data: items });
    }
  },

  setStorage: function(items) {
    if (this.app.appConn.isConnected) {
      this.app.appConn.appPort.postMessage({ action: 'storage', type: 'set', data: items });
    }
  },

  clearStorage: function() {
    if (this.app.appConn.isConnected) {
      this.app.appConn.appPort.postMessage({ action: 'storage', type: 'clear' });
    }
  }

};
