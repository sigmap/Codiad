/*
 *  Copyright (c) Codiad & Kent Safranski (codiad.com), distributed
 *  as-is and without warranty under the MIT License. See
 *  [root]/license.txt for more. This information must remain intact.
 */

(function(global, $){

    var codiad = global.codiad;

    $(window)
        .load(function() {
            codiad.filemanager.init();
        });

    codiad.filemanager = {

        clipboard: '',

        noOpen: ['jpg', 'jpeg', 'png', 'gif', 'svg', 'bmp', 'exe', 'zip', 'tar', 'tar.gz'],

        controller: 'components/filemanager/controller.php',
        dialog: 'components/filemanager/dialog.php',
        dialogUpload: 'components/filemanager/dialog_upload.php',

        init: function() {
            // Initialize node listener
            this.nodeListener();
            // Load uploader
            $.loadScript("components/filemanager/upload_scripts/jquery.ui.widget.js", true);
            $.loadScript("components/filemanager/upload_scripts/jquery.iframe-transport.js", true);
            $.loadScript("components/filemanager/upload_scripts/jquery.fileupload.js", true);
        },

        //////////////////////////////////////////////////////////////////
        // Listen for dbclick events on nodes
        //////////////////////////////////////////////////////////////////

        nodeListener: function() {
            var _this = this;

            $('#file-manager a')
                .live('dblclick', function() { // Open or Expand
                    if ($(this)
                        .hasClass('directory')) {
                        _this.index($(this)
                            .attr('data-path'));
                    } else {
                        _this.openFile($(this)
                            .attr('data-path'));
                    }
                })
                .live("contextmenu", function(e) { // Context Menu
                    e.preventDefault();
                    _this.contextMenuShow(e, $(this)
                        .attr('data-path'), $(this)
                        .attr('data-type'));
                    $(this)
                        .addClass('context-menu-active');
                });
        },

        //////////////////////////////////////////////////////////////////
        // Context Menu
        //////////////////////////////////////////////////////////////////

        contextMenuShow: function(e, path, type) {

            var _this = this;

            // Selective options
            switch (type) {
            case 'directory':
                $('#context-menu .directory-only, #context-menu .non-root')
                    .show();
                $('#context-menu .file-only')
                    .hide();
                break;
            case 'file':
                $('#context-menu .directory-only')
                    .hide();
                $('#context-menu .file-only,#context-menu .non-root')
                    .show();
                break;
            case 'root':
                $('#context-menu .directory-only')
                    .show();
                $('#context-menu .non-root, #context-menu .file-only')
                    .hide();
                break;
            }
            // Show menu
            $('#context-menu')
                .css({
                'top': (e.pageY - 10) + 'px',
                'left': (e.pageX - 10) + 'px'
            })
                .fadeIn(200)
                .attr('data-path', path)
                .attr('data-type', type);
            // Show faded 'paste' if nothing in clipboard
            if (this.clipboard === '') {
                $('#context-menu a[content="Paste"]')
                    .addClass('disabled');
            } else {
                $('#context-menu a[data-action="paste"]')
                    .removeClass('disabled');
            }
            // Hide menu
            $('#file-manager, #editor-region')
                .on('mouseover', function() {
                    _this.contextMenuHide();
                });
            // Hide on click
            $('#context-menu a')
                .click(function() {
                    _this.contextMenuHide();
                });
        },

        contextMenuHide: function() {
            $('#context-menu')
                .fadeOut(200);
            $('#file-manager a')
                .removeClass('context-menu-active');
        },

        //////////////////////////////////////////////////////////////////
        // Return the node name (sans path)
        //////////////////////////////////////////////////////////////////

        getShortName: function(path) {
            return path.split('/')
                .pop();
        },

        //////////////////////////////////////////////////////////////////
        // Return extension
        //////////////////////////////////////////////////////////////////

        getExtension: function(path) {
            return path.split('.')
                .pop();
        },

        //////////////////////////////////////////////////////////////////
        // Return type
        //////////////////////////////////////////////////////////////////

        getType: function(path) {
            return $('#file-manager a[data-path="' + path + '"]')
                .attr('data-type');
        },

        //////////////////////////////////////////////////////////////////
        // Create node in file tree
        //////////////////////////////////////////////////////////////////

        createObject: function(parent, path, type) {
            // NODE FORMAT: <li><a class="{type} {ext-file_extension}" data-type="{type}" data-path="{path}">{short_name}</a></li>
            var parentNode = $('#file-manager a[data-path="' + parent + '"]');
            if (!$('#file-manager a[data-path="' + path + '"]')
                .length) { // Doesn't already exist
                if (parentNode.hasClass('open') && parentNode.hasClass('directory')) { // Only append node if parent is open (and a directory)
                    var shortName = this.getShortName(path);
                    if (type == 'directory') {
                        var appendage = '<li><a class="directory" data-type="directory" data-path="' + path + '">' + shortName + '</a></li>';
                    } else {
                        var appendage = '<li><a class="file ext-' +
                            this.getExtension(shortName) +
                            '" data-type="file" data-path="' +
                            path + '">' + shortName + '</a></li>';
                    }
                    if (parentNode.siblings('ul')
                        .length) { // UL exists, other children to play with
                        parentNode.siblings('ul')
                            .append(appendage);
                    } else {
                        $('<ul>' + appendage + '</ul>')
                            .insertAfter(parentNode);
                    }
                }
            }
        },

        //////////////////////////////////////////////////////////////////
        // Loop out all files and folders in directory path
        //////////////////////////////////////////////////////////////////

        index: function(path, rescan) {
            if (rescan === undefined) {
                rescan = false;
            }
            node = $('#file-manager a[data-path="' + path + '"]');
            if (node.hasClass('open') && !rescan) {
                node.parent('li')
                    .children('ul')
                    .slideUp(300, function() {
                    $(this)
                        .remove();
                    node.removeClass('open');
                });
            } else {
                node.addClass('loading');
                $.get(this.controller + '?action=index&path=' + path, function(data) {
                    node.addClass('open');
                    var objectsResponse = codiad.jsend.parse(data);
                    if (objectsResponse != 'error') {
                        files = objectsResponse.index;
                        if (files.length > 0) {
                            var display = 'display:none;';
                            if (rescan) {
                                display = '';
                            }
                            var appendage = '<ul style="' + display + '">';
                            $.each(files, function(index) {
                                var ext = '';
                                var name = files[index].name.replace(path, '');
                                name = name.split('/')
                                    .join(' ');
                                if (files[index].type == 'file') {
                                    var ext = ' ext-' + name.split('.')
                                        .pop();
                                }
                                appendage += '<li><a class="' + files[index].type + ext + '" data-type="' + files[index].type + '" data-path="' + files[index].name + '">' + name + '</a></li>';
                            });
                            appendage += '</ul>';
                            if (rescan) {
                                node.parent('li')
                                    .children('ul')
                                    .remove();
                            }
                            $(appendage)
                                .insertAfter(node);
                            if (!rescan) {
                                node.siblings('ul')
                                    .slideDown(300);
                            }
                        }
                    }
                    node.removeClass('loading');
                    if (rescan && this.rescanChildren.length > this.rescanCounter) {
                        this.rescan(this.rescanChildren[this.rescanCounter++]);
                    } else {
                        this.rescanChildren = [];
                        this.rescanCounter = 0;
                    }
                });
            }
        },

        rescanChildren: [],

        rescanCounter: 0,

        rescan: function(path) {
            var _this = this;
            if (this.rescanCounter === 0) {
                // Create array of open directories
                node = $('#file-manager a[data-path="' + path + '"]');
                node.parent()
                    .find('a.open')
                    .each(function() {
                        _this.rescanChildren.push($(this)
                            .attr('data-path'));
                    });
            }

            this.index(path, true);
        },

        //////////////////////////////////////////////////////////////////
        // Open File
        //////////////////////////////////////////////////////////////////

        openFile: function(path) {
            var ext = this.getExtension(path);
            if ($.inArray(ext, this.noOpen) < 0) {
                $.get(this.controller + '?action=open&path=' + path, function(data) {
                    var openResponse = codiad.jsend.parse(data);
                    if (openResponse != 'error') {
                        codiad.active.open(path, openResponse.content, false);
                    }
                });
            } else {
                this.download(path);
            }
        },

        //////////////////////////////////////////////////////////////////
        // Open in browser
        //////////////////////////////////////////////////////////////////

        openInBrowser: function(path) {
            $.get(this.controller + '?action=open_in_browser&path=' + path, function(data) {
                var openIBResponse = codiad.jsend.parse(data);
                if (openIBResponse != 'error') {
                    window.open(openIBResponse.url, '_newtab');
                }
            });
        },

        //////////////////////////////////////////////////////////////////
        // Save file
        //////////////////////////////////////////////////////////////////

        saveFile: function(path, content, callbacks) {
            callbacks = callbacks || {};
            var _this = this;
            var notifySaveErr = function() {
                codiad.message.error('File could not be saved');
                if (typeof callbacks.error === 'function') {
                    var context = callbacks.context || _this;
                    callbacks.error.apply(context, [data]);
                }
            }
            $.post(this.controller + '?action=modify&path=' + path, {
                    content: content
                }, function(data) {
                    var saveResponse = codiad.jsend.parse(data);
                    if (saveResponse != 'error') {
                        codiad.message.success('File Saved');
                    }
                    if (typeof callbacks.success === 'function') {
                        var context = callbacks.context || _this;
                        callbacks.success.apply(context, [data]);
                    } else {
                        notifySaveErr();
                    }
                })
                .error(notifySaveErr);
        },

        //////////////////////////////////////////////////////////////////
        // Create Object
        //////////////////////////////////////////////////////////////////

        createNode: function(path, type) {
            codiad.modal.load(250, this.dialog + '?action=create&type=' + type + '&path=' + path);
            $('#modal-content form')
                .live('submit', function(e) {
                    e.preventDefault();
                    var shortName = $('#modal-content form input[name="object_name"]')
                        .val();
                    var path = $('#modal-content form input[name="path"]')
                        .val();
                    var type = $('#modal-content form input[name="type"]')
                        .val();
                    var createPath = path + '/' + shortName;
                    $.get(codiad.filemanager.controller + '?action=create&path=' + createPath + '&type=' + type, function(data) {
                        var createResponse = codiad.jsend.parse(data);
                        if (createResponse != 'error') {
                            codiad.message.success(type.charAt(0)
                                .toUpperCase() + type.slice(1) + ' Created');
                            codiad.modal.unload();
                            // Add new element to filemanager screen
                            codiad.filemanager.createObject(path, createPath, type);
                        }
                    });
                });
        },

        //////////////////////////////////////////////////////////////////
        // Copy to Clipboard
        //////////////////////////////////////////////////////////////////

        copyNode: function(path) {
            this.clipboard = path;
            codiad.message.success('Copied to Clipboard');
        },

        //////////////////////////////////////////////////////////////////
        // Paste
        //////////////////////////////////////////////////////////////////

        pasteNode: function(path) {
            var _this = this;
            if (this.clipboard == '') {
                codiad.message.error('Nothing in Your Clipboard');
            } else if (path == this.clipboard) {
                codiad.message.error('Cannot Paste Directory Into Itself');
            } else {
                var shortName = _this.getShortName(_this.clipboard);
                if ($('#file-manager a[data-path="' + path + '/' + shortName + '"]')
                    .length) { // Confirm overwrite?
                    codiad.modal.load(400, this.dialog + '?action=overwrite&path=' + path + '/' + shortName);
                    $('#modal-content form')
                        .live('submit', function(e) {
                        e.preventDefault();
                        _this.processPasteNode(path);
                    });
                } else { // No conflicts; proceed...
                    _this.processPasteNode(path);
                }
            }
        },

        processPasteNode: function(path) {
            var _this = this;
            var shortName = this.getShortName(this.clipboard);
            var type = this.getType(this.clipboard);
            $.get(this.controller + '?action=duplicate&path=' +
                this.clipboard + '&destination=' +
                path + '/' + shortName, function(data) {
                    var pasteResponse = codiad.jsend.parse(data);
                    if (pasteResponse != 'error') {
                        _this.createObject(path, path + '/' + shortName, type);
                        codiad.modal.unload();
                    }
                });
        },

        //////////////////////////////////////////////////////////////////
        // Rename
        //////////////////////////////////////////////////////////////////

        renameNode: function(path) {
            var shortName = this.getShortName(path);
            var type = this.getType(path);
            var _this = this;
            codiad.modal.load(250, this.dialog + '?action=rename&path=' + path + '&short_name=' + shortName + '&type=' + type);
            $('#modal-content form')
                .live('submit', function(e) {
                    e.preventDefault();
                    var newName = $('#modal-content form input[name="object_name"]')
                        .val();
                    // Build new path
                    var arr = path.split('/');
                    var temp = new Array();
                    for (i = 0; i < arr.length - 1; i++) {
                        temp.push(arr[i])
                    }
                    var newPath = temp.join('/') + '/' + newName;
                    $.get(_this.controller + '?action=modify&path=' + path + '&new_name=' + newName, function(data) {
                        var renameResponse = codiad.jsend.parse(data);
                        if (renameResponse != 'error') {
                            codiad.message.success(type.charAt(0)
                                .toUpperCase() + type.slice(1) + ' Renamed');
                            var node = $('#file-manager a[data-path="' + path + '"]');
                            // Change pathing and name for node
                            node.attr('data-path', newPath)
                                .html(newName);
                            if (type == 'file') { // Change icons for file
                                curExtClass = 'ext-' + _this.getExtension(path);
                                newExtClass = 'ext-' + _this.getExtension(newPath);
                                $('#file-manager a[data-path="' + newPath + '"]')
                                    .removeClass(curExtClass)
                                    .addClass(newExtClass);
                            } else { // Change pathing on any sub-files/directories
                                _this.repathSubs(path, newPath);
                            }
                            // Change any active files
                            codiad.active.rename(path, newPath);
                            codiad.modal.unload();
                        }
                    });
                });
        },

        repathSubs: function(oldPath, newPath) {
            $('#file-manager a[data-path="' + newPath + '"]')
                .siblings('ul')
                .find('a')
                .each(function() {
                // Hit the children, hit 'em hard
                var curPath = $(this)
                    .attr('data-path');
                var revisedPath = curPath.replace(oldPath, newPath);
                $(this)
                    .attr('data-path', revisedPath);
            });
        },

        //////////////////////////////////////////////////////////////////
        // Delete
        //////////////////////////////////////////////////////////////////

        deleteNode: function(path) {
            var _this = this;
            codiad.modal.load(400, this.dialog + '?action=delete&path=' + path);
            $('#modal-content form')
                .live('submit', function(e) {
                e.preventDefault();
                $.get(_this.controller + '?action=delete&path=' + path, function(data) {
                    var deleteResponse = codiad.jsend.parse(data);
                    if (deleteResponse != 'error') {
                        var node = $('#file-manager a[data-path="' + path + '"]');
                        node.parent('li')
                            .remove();
                        // Close any active files
                        $('#active-files a')
                            .each(function() {
                                var curPath = $(this)
                                    .attr('data-path');
                                if (curPath.indexOf(path) == 0) {
                                    codiad.active.remove(curPath);
                                }
                            });
                    }
                    codiad.modal.unload();
                });
            });
        },

        //////////////////////////////////////////////////////////////////
        // Search
        //////////////////////////////////////////////////////////////////

        search: function(path) {
            codiad.modal.load(500, this.dialog + '?action=search&path=' + path);
            codiad.modal.hideOverlay();
            var _this = this;
            $('#modal-content form')
                .live('submit', function(e) {
                $('#filemanager-search-processing')
                    .show();
                e.preventDefault();
                searchString = $('#modal-content form input[name="search_string"]')
                    .val();
                $.post(_this.controller + '?action=search&path=' + path, {
                    search_string: searchString
                }, function(data) {
                    searchResponse = codiad.jsend.parse(data);
                    if (searchResponse != 'error') {
                        var results = '';
                        $.each(searchResponse.index, function(key, val) {
                            results += '<div><a onclick="codiad.filemanager.openFile(\'' + val['file'] + '\');setTimeout( function() { codiad.active.gotoLine(' + val['line'] + '); }, 500);codiad.modal.unload();">Line ' + val['line'] + ': ' + val['file'] + '</a></div>';
                        });
                        $('#filemanager-search-results')
                            .slideDown()
                            .html(results);
                    } else {
                        $('#filemanager-search-results')
                            .slideUp();
                    }
                    $('#filemanager-search-processing')
                        .hide();
                });
            });
        },

        //////////////////////////////////////////////////////////////////
        // Upload
        //////////////////////////////////////////////////////////////////

        uploadToNode: function(path) {
            codiad.modal.load(500, this.dialogUpload + '?path=' + path);
        },

        //////////////////////////////////////////////////////////////////
        // Download
        //////////////////////////////////////////////////////////////////

        download: function(path) {
            var type = this.getType(path);
            $('#download')
                .attr('src', 'components/filemanager/download.php?path=' + path + '&type=' + type);
        }
    };

})(this, jQuery);

