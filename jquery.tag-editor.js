/*
	jQuery tagEditor v1.0.4
    Copyright (c) 2014 Simon Steinberger / Pixabay
    GitHub: https://github.com/Pixabay/jQuery-tagEditor
	License: http://www.opensource.org/licenses/mit-license.php
*/

(function($){
    // modified autoGrowInput - stackoverflow.com/questions/931207
    // lets input fields grow dynamically on change
    $.fn.autoGrowInput=function(o){o=$.extend({maxWidth:250,minWidth:20,comfortZone:0},o);this.filter('input:text').each(function(){var minWidth=o.minWidth||$(this).width(),val=' ',input=$(this),comfortZone=o.comfortZone?o.comfortZone:parseInt(parseInt($(this).css('fontSize'))*0.9),dummy=$('<dummy/>').css({position:'absolute',top:-9999,left:-9999,width:'auto',fontSize:input.css('fontSize'),fontFamily:input.css('fontFamily'),fontWeight:input.css('fontWeight'),letterSpacing:input.css('letterSpacing'),whiteSpace:'nowrap'}),check=function(){if(val===(val=input.val()))return;dummy.html(val.replace(/&/g,'&amp;').replace(/\s/g,'&nbsp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'));var newWidth=dummy.width()+comfortZone;if(newWidth>o.maxWidth)newWidth=o.maxWidth;if(newWidth<o.minWidth)newWidth=o.minWidth;if(newWidth!=input.width())input.width(newWidth);};dummy.insertAfter(input);$(this).bind('keyup keydown blur focus autogrow',check);});return this;};

    // code.accursoft.com/caret/overview
    // used to set cursor position in input fields
    !function(e){e.fn.caret=function(e){var t=this[0],n="true"===t.contentEditable;if(0==arguments.length){if(window.getSelection){if(n){t.focus();var o=window.getSelection().getRangeAt(0),r=o.cloneRange();return r.selectNodeContents(t),r.setEnd(o.endContainer,o.endOffset),r.toString().length}return t.selectionStart}if(document.selection){if(t.focus(),n){var o=document.selection.createRange(),r=document.body.createTextRange();return r.moveToElementText(t),r.setEndPoint("EndToEnd",o),r.text.length}var e=0,c=t.createTextRange(),r=document.selection.createRange().duplicate(),a=r.getBookmark();for(c.moveToBookmark(a);0!==c.moveStart("character",-1);)e++;return e}return 0}if(-1==e&&(e=this[n?"text":"val"]().length),window.getSelection)n?(t.focus(),window.getSelection().collapse(t.firstChild,e)):t.setSelectionRange(e,e);else if(document.body.createTextRange)if(n){var c=document.body.createTextRange();c.moveToElementText(t),c.moveStart("character",e),c.collapse(!0),c.select()}else{var c=t.createTextRange();c.move("character",e),c.select()}return n||t.focus(),e}}(jQuery);

    // plugin with val as parameter for public methods
    $.fn.tagEditor = function(options, val, next){

        // build options dictionary with default values
        var blur_result, o = $.extend({}, $.fn.tagEditor.defaults, options), selector = this;

        // store regex and default delimiter in options for later use
        o.dregex = new RegExp('['+o.delimiter.replace('-', '\-')+']', 'g');

        // public methods
        if (typeof options == 'string') {

            // depending on selector, response may contain tag lists of multiple editor instances
            var response = [];
            selector.each(function(){
                // the editor is the next sibling to the hidden, original field
                var el = $(this), o = el.data('options'), ed = el.next('.tag-editor');
                if (options == 'getTags')
                    response.push({field: el[0], editor: ed, tags: ed.data('tags')});
                else if (options == 'addTag') {
                    // insert new tag
                    $('<li><div class="tag-editor-spacer">&nbsp;'+o.delimiter[0]+'</div><div class="tag-editor-tag"></div><div class="tag-editor-delete"><i></i></div></li>').appendTo(ed).find('.tag-editor-tag')
                        .html('<input type="text" maxlength="'+o.maxLength+'">').addClass('active').find('input').val(val).blur();
                    if (next != 'blur') ed.click();
                    else $('.placeholder', ed).remove();
                } else if (options == 'removeTag') {
                    // trigger delete on matching tag, then click editor to create a new tag
                    $('.tag-editor-tag', ed).filter(function(){return $(this).html()==val;}).closest('li').find('.tag-editor-delete').click();
                    if (next != 'blur') ed.click();
                } else if (options == 'destroy') {
                    el.css('display', o.elDisplay).removeData('options').next('.tag-editor').remove();
                }
            });
            return response;
        }

        // delete selected tags on backspace, delete, ctrl+x
        function delete_selected_tags(e){
            if (e.which == 8 || e.which == 46 || e.ctrlKey && e.which == 88) {
                var sel = getSelection(), el = $(sel.getRangeAt(0).commonAncestorContainer);
                if (el.hasClass('tag-editor')) {
                    var tags = [], splits = sel.toString().split(el.prev().data('options').dregex);
                    for (i=0; i<splits.length; i++){ var tag = $.trim(splits[i]); if (tag) tags.push(tag); }
                    $('.tag-editor-tag', el).each(function(){
                        if (~$.inArray($(this).html(), tags)) $(this).closest('li').find('.tag-editor-delete').click();
                    });
                    return false;
                }
            }
        }
        if (window.getSelection) $(document).off('keydown.tag-editor').on('keydown.tag-editor', delete_selected_tags);

        return selector.each(function(){
            var el = $(this), tag_list = [];

            // create editor (ed) instance
            o.elDisplay = el.css('display'); // store for destroy method
            el.css('display', 'none');
            var ed = $('<ul '+(o.clickDelete ? 'oncontextmenu="return false;" ' : '')+'class="tag-editor"></ul>').insertAfter(el);
            el.data('options', o); // set data on hidden field

            // add dummy item for min-height on empty editor
            ed.append('<li style="width:.1px">&nbsp;</li>');

            // markup for new tag
            var new_tag = '<li><div class="tag-editor-spacer">&nbsp;'+o.delimiter[0]+'</div><div class="tag-editor-tag"></div><div class="tag-editor-delete"><i></i></div></li>';

            // helper: update global data
            function set_placeholder(){
                if (o.placeholder && !tag_list.length && !$('.deleted, .placeholder, input', ed).length)
                    ed.append('<li class="placeholder"><div>'+o.placeholder+'</div></li>');
            }

            // helper: update global data
            function update_globals(init){
                var old_tags = tag_list.toString();
                tag_list = $('.tag-editor-tag:not(.deleted)', ed).map(function(i, e) {
                    var val = $.trim($(this).hasClass('active') ? $(this).find('input').val() : $(e).text());
                    if (val) return val;
                }).get();
                ed.data('tags', tag_list);
                el.val(tag_list.join(o.delimiter[0]));
                // change callback except for plugin init
                if (!init) if (old_tags != tag_list.toString()) o.onChange(el, ed, tag_list);
                set_placeholder();
            }

            ed.click(function(e){
                // do not create tag when user selects tags by text selection
                if (window.getSelection && getSelection() != '') return;

                blur_result = true
                $('input:focus', ed).blur();
                if (!blur_result) return false;
                blur_result = true

                // always remove placeholder on click
                $('.placeholder', ed).remove();

                // calculate tag closest to click position
                var d, dist = 99999, closest_tag, loc;
                $('.tag-editor-tag', ed).each(function(){
                    var tag = $(this), to = tag.offset(), tag_x = to.left, tag_y = to.top;
                    if (e.pageY >= tag_y && e.pageY <= tag_y+tag.height()) {
                        if (e.pageX < tag_x) loc = 'before', d = tag_x - e.pageX;
                        else loc = 'after', d = e.pageX - tag_x - tag.width();
                        if (d < dist) dist = d, closest_tag = tag;
                    }
                });
                if (loc == 'before')
                    $(new_tag).insertBefore(closest_tag.closest('li')).find('.tag-editor-tag').click();
                else if (loc == 'after')
                    $(new_tag).insertAfter(closest_tag.closest('li')).find('.tag-editor-tag').click();
                else // empty editor
                    $(new_tag).appendTo(ed).find('.tag-editor-tag').click();
                return false;
            });

            ed.on('click', '.tag-editor-delete', function(e){
                // delete icon is hidden when input is visible; place cursor near invisible delete icon on click
                if ($(this).prev().hasClass('active')) { $(this).closest('li').find('input').caret(-1); return false; }

                var li = $(this).closest('li'), tag = li.find('.tag-editor-tag');
                if (o.beforeTagDelete(el, ed, tag_list, tag.html()) === false) return false;
                tag.addClass('deleted').animate({width: 0}, 175, function(){ li.remove(); set_placeholder(); });
                update_globals();
                return false;
            });

            // delete on right mouse click or ctrl+click
            if (o.clickDelete)
                ed.on('mousedown', '.tag-editor-tag', function(e){
                    if (e.ctrlKey || e.which > 1) {
                        var li = $(this).closest('li'), tag = li.find('.tag-editor-tag');
                        if (o.beforeTagDelete(el, ed, tag_list, tag.html()) === false) return false;
                        tag.addClass('deleted').animate({width: 0}, 175, function(){ li.remove(); set_placeholder(); });
                        update_globals();
                        return false;
                    }
                });

            ed.on('click', '.tag-editor-tag', function(e){
                // delete on right click or ctrl+click -> exit
                if (o.clickDelete && (e.ctrlKey || e.which > 1)) return false;

                if (!$(this).hasClass('active')) {
                    var tag = $(this).html();
                    // guess cursor position in text input
                    var left_percent = Math.abs(($(this).offset().left - e.pageX)/$(this).width()), caret_pos = parseInt(tag.length*left_percent),
                        input = $(this).html('<input type="text" maxlength="'+o.maxLength+'" value="'+tag+'">').addClass('active').find('input');
                        input.data('old_tag', tag).focus().autoGrowInput().trigger('autogrow').caret(caret_pos);
                    if (o.autocomplete) {
                        var aco = $.extend({}, o.autocomplete);
                        // extend user provided autocomplete select method
                        var ac_select = 'select'  in aco ? o.autocomplete.select : '';
                        aco.select = function(){ if (ac_select) ac_select(); setTimeout(function(){ $('.active', ed).find('input').trigger('autogrow'); }, 20); };
                        input.autocomplete(aco);
                    }
                }
                return false;
            });

            // helper: split into multiple tags, e.g. after paste
            function split_cleanup(input){
                var li = input.closest('li'), sub_tags = input.val().replace(/ +/, ' ').split(o.dregex), old_tag = input.data('old_tag');
                var old_tags = tag_list.slice(0); // copy tag_list
                for (i in sub_tags) {
                    tag = $.trim(sub_tags[i]).slice(0, o.maxLength);
                    if (tag) {
                        if (o.forceLowercase) tag = tag.toLowerCase();
                        o.beforeTagSave(el, ed, old_tags, old_tag, tag);
                        // remove duplicates
                        if (~$.inArray(tag, old_tags))
                            $('.tag-editor-tag', ed).each(function(){ if ($(this).html() == tag) $(this).closest('li').remove(); });
                        old_tags.push(tag);
                        li.before('<li><div class="tag-editor-spacer">&nbsp;'+o.delimiter[0]+'</div><div class="tag-editor-tag">'+tag+'</div><div class="tag-editor-delete"><i></i></div></li>');
                    }
                }
                input.attr('maxlength', o.maxLength).removeData('old_tag').val('').focus();
                update_globals();
            }

            ed.on('blur', 'input', function(e){
                var input = $(this), old_tag = input.data('old_tag'), tag = $.trim(input.val().replace(/ +/, ' ').replace(o.dregex, o.delimiter[0]));
                if (!tag) {
                    if (old_tag && o.beforeTagDelete(el, ed, tag_list, old_tag) === false) {
                        input.val(old_tag).trigger('autogrow').focus();
                        blur_result = false;
                        update_globals();
                        return;
                    }
                    try { input.closest('li').remove(); } catch(e){}
                    if (old_tag) update_globals();
                }
                else if (tag.indexOf(o.delimiter[0])>=0) { split_cleanup(input); return; }
                else if (tag != old_tag) {
                    if (o.forceLowercase) tag = tag.toLowerCase();
                    o.beforeTagSave(el, ed, tag_list, old_tag, tag);
                    // remove duplicates
                    $('.tag-editor-tag:not(.active)', ed).each(function(){ if ($(this).html() == tag) $(this).closest('li').remove(); });
                }
                input.parent().html(tag).removeClass('active');
                if (tag != old_tag) update_globals();
                set_placeholder();
            });

            var pasted_content;
            ed.on('paste', 'input', function(e){
                $(this).removeAttr('maxlength');
                pasted_content = $(this);
                setTimeout(function(){ split_cleanup(pasted_content); }, 30);
            });

            // keypress delimiter
            var inp;
            ed.on('keypress', 'input', function(e){
                if (o.delimiter.indexOf(String.fromCharCode(e.which))>=0) {
                    inp = $(this);
                    setTimeout(function(){ split_cleanup(inp); }, 20);
                }
            });

            ed.on('keydown', 'input', function(e){
                var $t = $(this);
                // left/up key + backspace key on empty field
                if ((e.which == 37 || !o.autocomplete && e.which == 38) && !$t.caret() || e.which == 8 && !$t.val()) {
                    var prev_tag = $t.closest('li').prev('li').find('.tag-editor-tag');
                    if (prev_tag.length) prev_tag.click().find('input').caret(-1);
                    else if ($t.val()) $(new_tag).insertBefore($t.closest('li')).find('.tag-editor-tag').click();
                    return false;
                }
                // right/down key
                else if ((e.which == 39 || !o.autocomplete && e.which == 40) && ($t.caret() == $t.val().length)) {
                    var next_tag = $t.closest('li').next('li').find('.tag-editor-tag');
                    if (next_tag.length) next_tag.click().find('input').caret(0);
                    else if ($t.val()) ed.click();
                    return false;
                }
                // tab key
                else if (e.which == 9) {
                    if (e.shiftKey) { // jump left
                        var prev_tag = $t.closest('li').prev('li').find('.tag-editor-tag');
                        if (prev_tag.length) prev_tag.click().find('input').caret(0);
                        else if ($t.val()) $(new_tag).insertBefore($t.closest('li')).find('.tag-editor-tag').click();
                    } else { // jump right
                        var next_tag = $t.closest('li').next('li').find('.tag-editor-tag');
                        if (next_tag.length) next_tag.click().find('input').caret(0);
                        else if ($t.val()) ed.click();
                    }
                    return false;
                }
                // del key
                else if (e.which == 46 && (!$.trim($t.val()) || ($t.caret() == $t.val().length))) {
                    var next_tag = $t.closest('li').next('li').find('.tag-editor-tag');
                    if (next_tag.length) next_tag.click().find('input').caret(0);
                    else if ($t.val()) ed.click();
                    return false;
                }
                // enter key
                else if (e.which == 13) {
                    var next_tag = $t.closest('li').next('li').find('.tag-editor-tag');
                    if (next_tag.length) next_tag.click().find('input').caret(0);
                    else if ($t.val()) ed.click();
                    return false;
                }
                // pos1
                else if (e.which == 36 && !$t.caret()) ed.find('.tag-editor-tag').first().click();
                // end
                else if (e.which == 35 && $t.caret() == $t.val().length) ed.find('.tag-editor-tag').last().click();
                // esc
                else if (e.which == 27) {
                    $t.val($t.data('old_tag') ? $t.data('old_tag') : '').blur();
                    return false;
                }
            });

            // create initial tags
            var tags = o.initialTags.length ? o.initialTags : el.val().split(o.dregex);
            for (i in tags) {
                var tag = $.trim(tags[i].replace(/ +/, ' '));
                if (tag) {
                    if (o.forceLowercase) tag = tag.toLowerCase();
                    tag_list.push(tag);
                    ed.append('<li><div class="tag-editor-spacer">&nbsp;'+o.delimiter[0]+'</div><div class="tag-editor-tag">'+tag+'</div><div class="tag-editor-delete"><i></i></div></li>');
                }
            }
            update_globals(true); // true -> no onChange callback

            // init sortable
            if (o.sortable && $.fn.sortable) ed.sortable({
                distance: 5, cancel: '.tag-editor-spacer, input', helper: 'clone',
                update: function(){ update_globals(); }
            });
        });
    };

    $.fn.tagEditor.defaults = {
        initialTags: [],
        maxLength: 50,
        delimiter: ',;',
        placeholder: '',
        forceLowercase: true,
        clickDelete: false,
        sortable: true, // jQuery UI sortable
        autocomplete: null, // options dict for jQuery UI autocomplete

        // callbacks
        onChange: function(){},
        beforeTagSave: function(){},
        beforeTagDelete: function(){}
    };
}(jQuery));
