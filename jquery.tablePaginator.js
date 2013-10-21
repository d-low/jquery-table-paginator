/**
  * @description The table paginator plug-in wraps a standard table in elements that allow
  * for the pagination of the table column by column.  This allows a table which is very
  * long to fit into a fixed with parent container and be viewed by clicking the paginate
  * buttons.
  * @param options Object of settings that can be specified for configuration of the plug-in.
  * @param options.resizeWhenWindowResized False by default. If true to have the plug-in 
  * resize itself when the window is resized.
  * @param options.lastColumnStationary False by default. If true then the last column of the
  * table should be stationary and displayed next to the carousel next button.
  */

(function ($) {

  /**
   * @description Initialize the jQuery tablePaginator plug-in on the specified table.
   * @params options An object consisting of the following optional properites:
   */

  var init = function(options) {

    if (!this || this.length == 0) {
      return;
    }

    if (this.find('thead').html().length == 0 || this.find('tbody').html().length == 0) {
      return this;
    }

    //
    // Only instantiate once instance of our plug-in per table.
    //

    if (! this.data("tablePaginator")) {
  
      //
      // Get any user specified options
      //
    
      options = getOptions(options); 
      
      //
      // Create the table paginator.
      //

      var $tablePaginator = null;

      var oCreate = create(this, options);

      var $tablePaginator = oCreate.tablePaginator;
      var widths = oCreate.widths;

      this.hide();

      $tablePaginator.insertAfter(this);

      // 
      // Apply behavior
      //

      $tablePaginator.find("div.carousel a")
        .unbind("click.tablePaginator")
        .bind("click.tablePaginator",
          function (e) {
            carousel_click(e);
          }
        );

      if (options.resizeWhenWindowResized == true) {
        $(window)
          .unbind("resize.tablepaginator")
          .bind("resize.tablepaginator", {$el: this}, window_resize);
      }

      //
      // Save the current column, the left most one which is visible, and the number of 
      // columns in the table (less the one used for the label), to the table paginator
      // control.  And save the table paginator instance to the data elements of the 
      // table for use in our destroy method.
      //

      $tablePaginator.data("paginationData", {
        currentColumn: 0,
        numColumns: this.find("thead th").length - 1
      });

      $tablePaginator.data("widths", widths);
      $tablePaginator.data("options", options);

      this.data("tablePaginator", {
        paginator: $tablePaginator
      });
    }

    //
    // Return the table in case callers need to use it!
    //

    return this;

  }; // end init()


  /**
   * @desecription Create a new paginatable table control element for the specified table.
   * This method is a revision to the original paginate-able table created for Totem.  It 
   * differs in the HTML used.  This method will generate an element will have a label table 
   * floated left that contains the previous carousel button and the first column of both the 
   * thead and tbody; a table container that has a fixed width allowing the original table, with
   * out the first column, to be paginated; and a third empty table that contains the next 
   * carousel button.  And if the lastColumnStationary option was specified, then the last 
   * column of the table we be included as part of the carousel next button.
   */

  var create = function ($table, options) {

    //
    // Get additional element handles
    //

    var $thead = $table.find("thead");
    var $tbody = $table.find("tbody");

    //
    // Get widths of various components
    //

    var widths = getWidths($table, options);

    //
    // Construct the three tables that populate each main element of the table paginator control.
    //

    //
    // 1) Render the label table
    //    a) NOTE that this code assumes that the "label" content is very simple - either
    //       a single text node or a single anchor node
    //

    var labelTableTrElems = [];

    $tbody.find("tr td:first-child").each(
        function () {

          var label = '';
          var $first = $(this).children(":first");
          var $children = $(this).children();

          // td is empty
          if (this.childNodes.length == 0) { // td is empty
            labelTableTrElems.push(
              '<tr><td title="' + label + '">' + label + '</td></tr>'
              );
          }

          // td contains a single text node
          else if (this.childNodes.length == 1 && this.childNodes[0].nodeType == 3) { // td contains a single text node
            label = $(this).text();
            labelTableTrElems.push(
              '<tr><td title="' + label + '">' + ellipsize(label, 35) + '</td></tr>'
              );
          }

          // td contains a single anchor node
          else if ($children.length == 1 && $first.is('a')) {
            var title = $(this).attr("title");
            label = ellipsize($first.text(), 35);

          // If the anchor already contains a title leave it be!
          if (! $first.attr("title")) { 
              $first.attr("title", title);
          }

            $first.text(label);

            labelTableTrElems.push(
              '<tr><td title="' + title + '">' + $(this).html() + '</td></tr>'
              );
          }

          // td contains anything other than a text-only or anchor-only node
          else {
            // TBD: handle more cases as they occur
            labelTableTrElems.push(
              '<tr><td>' + $(this).html() + '</td></tr>'
          );
          }

        } // end function()

    ); // end each()

    var labelTable = [
      '<table class="standard">',
        '<thead>',
          '<tr>',
            '<th>',
              '<span class="label" style="width: ' + (widths.labelTableContainer - 21 - 13) + 'px;">',
                $thead.find("th:first").html(),
              '</span>',
              '<div class="carousel carouselPrevious disabled">',
                '<a href="javascript:void(0);" class="vsprite">',
                  '<span class="carouselArrow carouselLeftArrow"></span>',
                '</a>',
              '</div>',
            '</th>',
          '</tr>',
        '</thead>',
        '<tbody>',
          labelTableTrElems.join(""),
        '</tbody>',
      '</table>'
    ].join("");

    //
    // 2a) If the lastColumnStationary option was set to true then we need to save the contents from 
    // the last th and td elements, and include that in the navigation table we render below.
    //

    var lastColumnItems = { 
      th: null,
      tds: []
    };

    if (options.lastColumnStationary == true) {

      var $th = $thead.find("th:last");
      lastColumnItems.th = $th.html();

      $tbody.find("tr td:last-child").each(
        function() { 
          lastColumnItems.tds.push(
            $(this).html()
          );
        }
      );      
    }

    //
    // 2b) Render the main table
    //  

    var $mainTable = $table.clone();

    //
    // Remove the first th and td elements since they were included in the label table.
    //
    
    $mainTable.find("th:first-child, td:first-child").each(
      function () {
        $(this).remove();
      }
    );

    //
    // Remove the last th and td elements if they're included in the navigation table.
    //
    
    if (options.lastColumnStationary == true) {
      $mainTable.find("th:last-child, td:last-child").each(
        function () {
          $(this).remove();
        }
      );
    }

    $mainTable.find("th").each(
      function (index) {
        $(this).addClass("tablePaginatorCol" + index);
      }
    );

    //
    // 3) Render the next navigation table
    //

    var nextNavTableElems = [];

    $tbody.find("tr").each(
      function (index) {
        nextNavTableElems.push([
          '<tr>',
            '<td' + (options.lastColumnStationary == true ? ' colspan="2"' : '') + '>',
              (options.lastColumnStationary == true ? lastColumnItems.tds[index] : '&nbsp;'),
            '</td>',
          '</tr>'
        ].join(""));
      }
    );

    var nextNavTable = [
      '<table class="standard">',
        '<thead>',
          '<tr>',
            '<th>',
              '<div class="carousel carouselNext">',
                '<a href="javascript:void(0);" class="vsprite">',
                  '<span class="carouselArrow carouselRightArrow"></span>',
                '</a>',
              '</div>',
            '</th>',
            (options.lastColumnStationary == true ? '<th class="stationaryLastColumn">' + lastColumnItems.th + '</th>' : ''),
          '</tr>',
        '</thead>',
        '<tbody>',
          nextNavTableElems.join(""),
        '</tbody>',
      '</table>'
    ].join("");

    //
    // Render the table paginator.
    //

    var tablePaginator = [
      '<div class="tablePaginator contain" style="width: ' + widths.tablePaginator + 'px;">',
        '<div class="labelTableContainer" style="width: ' + widths.labelTableContainer + 'px;">',
          labelTable,
        '</div>',
        '<div class="mainTableContainer" style="width: ' + widths.mainTableContainer + 'px;">',
          '<table class="standard" style="width: ' + widths.table + 'px;">',
            $mainTable.html(),
          '</table>',
        '</div>',
        '<div class="nextNavTableContainer" style="width: ' + widths.nextNavTableContainer + 'px;">',
          nextNavTable,
        '</div>',
      '</div>'
    ];

    //
    // Return the table paginator and the widths.  We need to save the widths obtained from the original
    // object so that if they're recalculated as a result of resizing we still have them even after the 
    // original table is no longer displayed.
    //
    
    return {
      tablePaginator: $(tablePaginator.join("")),
      widths: widths
    };

  }; // end create()


  /**
   * @description Return the widths of all our generated elements calculated 
   * based on the width of the original table.
   */

  var getWidths = function($table, options) {

    var $tablePaginator = null;

    if ($table.data("tablePaginator")) { 
      $tablePaginator = $table.data("tablePaginator").paginator;
    }

    var $thead = $table.find("thead");

    var tablePaginatorWidth = $table.parent().width();
    var firstThWidth = $thead.find("th:first").outerWidth();
    var lastThWidth = $thead.find("th:last").outerWidth();

    // 
    // We use the original table header cell widths if they're avialable since 
    // we may not get accurate results if we query their widths in response to
    // a resize event after the original table has been hidden.
    //
  
    if ($tablePaginator) { 
      var ogWidths = $tablePaginator.data("widths");
    
      if (ogWidths) { 
        firstThWidth = ogWidths.firstTh;
        lastThWidth = ogWidths.lastTh;
      }
    }

    //
    // Get the options from the table paginator if we weren't explicitly passed any.  When we're 
    // resizing we may not be passed our original options, so we want to retrieve the version we
    // saved to the DOM for reuse here in deteriming whether the last column will be stationary.
    //
    
    if (! options) {
      if ($tablePaginator) { 
        options = $tablePaginator.data("options");
      }
    }
    
    //
    // Finally, calculate the widths and return them to the caller.
    //

    var nextNavTableContainerWidth = (options && options.lastColumnStationary ? 21 + lastThWidth : 21); // 21 is the width of the next carousel button.
    var labelTableContainerWidth = firstThWidth + 21; // +21 for the previous carousel button
    var mainTableContainerWidth = tablePaginatorWidth - labelTableContainerWidth - nextNavTableContainerWidth;
    var tableWidth = $table.outerWidth() - firstThWidth - (options && options.lastColumnStationary ? lastThWidth : 0);
  
    var widths = {
      tablePaginator: tablePaginatorWidth,
      firstTh: firstThWidth,
      labelTableContainer: labelTableContainerWidth,
      lastTh: lastThWidth,
      mainTableContainer: mainTableContainerWidth,
      table: tableWidth,
      nextNavTableContainer: nextNavTableContainerWidth
    };

    if (widths.table <= widths.mainTableContainer) {
      widths.table = widths.mainTableContainer;
    }

    return widths;
  };


  /**
   * @description Remove the jQuery tablePaginator plug-in from the specified table
   * and show the original table.
   */

  var destroy = function() {

    var data = this.data("tablePaginator");

    if (data) {
      data.paginator.remove();
      this.show();
      this.removeData("tablePaginator");
      $(window).unbind("resize.tablepaginator")
    }

    return this;
  };


  /**
   * @description Move the table back or forward if when the carousel buttons are clicked
   * and enable or disable the buttons as appropriate.
   */

  var carousel_click = function (e) {

    e.preventDefault();

    //
    // Get the carousel button that was clicked.
    //

    var $carousel = $(e.target).is("div.carousel") ? $(e.target) : $(e.target).closest("div.carousel");

    // 
    // And just return if it is disabled.
    //

    if ($carousel.hasClass("disabled")) {
      return;
    }

    //
    // Otherwise get the required elements.
    //

    var $tablePaginator = $carousel.closest("div.tablePaginator");
    var $mainTableContainer = $tablePaginator.find("div.mainTableContainer");
    var $table = $mainTableContainer.find("table");

    //
    // And then get the pagination data and determine the new left margin, which is based off
    // the new current table head's left offset from its parent table, which is relatively 
    // positioned.
    //

    var oPaginationData = $tablePaginator.data("paginationData");

    if ($carousel.hasClass("carouselPrevious")) {
      oPaginationData.currentColumn = oPaginationData.currentColumn - 1;
    }
    else if ($carousel.hasClass("carouselNext")) {
      oPaginationData.currentColumn = oPaginationData.currentColumn + 1;
    }

    var newMarginLeft = parseInt($table.find("th.tablePaginatorCol" + oPaginationData.currentColumn).position().left) * -1;

    //
    // Special cases for showing the first and last column:
    //
    // 1) If the new current column is the first then we set the new margin left to 0.
    // 2) If the new left margin plus the table width is less than or equal to the main
    // table container width, then set the new left margin to the table width minus the
    // main table container width so as not to scroll past the last column.
    // 3) If the new left margin is greater than 0 then then set it to 0 and start at the 
    // first column.  The left margin should always be a negative number.
    //

    if (oPaginationData.currentColumn == 0) {
      newMarginLeft = 0;
    }
    else if (newMarginLeft + $table.outerWidth() <= $mainTableContainer.outerWidth()) {
      newMarginLeft = ($table.outerWidth() - $mainTableContainer.outerWidth()) * -1;
    }
    else if (newMarginLeft > 0) {
      newMarginLeft = 0;
    }

    //
    // Next, set the left margin on the table and save the pagination data to the DOM.
    //

    $table.css("margin-left", newMarginLeft + "px");
    $tablePaginator.data("paginationData", oPaginationData);

    //
    // And finally, update the state of the carousel buttons appropriately.  We have three cases:
    //
    // 1) If the current column is 0 then disable the previous button and enable the next button.
    // 2) If the table's negative left margin plus the table width is equal to the table container's 
    // width then we disable the next button, since the last column is visible.
    // 3) Otherwise we enable both buttons.
    //

    var $carouselPrev = $tablePaginator.find("div.carouselPrevious");
    var $carouselNext = $tablePaginator.find("div.carouselNext");

    if (oPaginationData.currentColumn == 0) {
      $carouselPrev.addClass("disabled");
      $carouselNext.removeClass("disabled");
    }
    else if (newMarginLeft + $table.outerWidth() <= $mainTableContainer.outerWidth()) {
      $carouselPrev.removeClass("disabled");
      $carouselNext.addClass("disabled");
    }
    else {
      $carouselPrev.removeClass("disabled");
      $carouselNext.removeClass("disabled");
    }

  }; // end carousel_click()


  /**
   * @description When resizing the table paginator we need to reset the pagination.  For now
   * this method will simply start at the first column, but eventually it will preserve the 
   * column the user was viewing so that upon refreshing they will maintain their place in the 
   * table.
   */

  var resetPagination = function($table) { 

    var $tablePaginator = $table.data("tablePaginator").paginator;  
    var $carouselPrev = $tablePaginator.find("div.carouselPrevious");
    var $carouselNext = $tablePaginator.find("div.carouselNext");
    var $mainTableContainer = $tablePaginator.find("div.mainTableContainer");
    var oPaginationData = $tablePaginator.data("paginationData");
    var prevCurrentColumn = oPaginationData.currentColumn;  

    oPaginationData.currentColumn = 0;
    $tablePaginator.data("paginationData", oPaginationData);

    $mainTableContainer.find("table").css("margin-left", "0px");
    $carouselPrev.addClass("disabled");
    $carouselNext.removeClass("disabled");

    //
    // Move to the old current column by triggering onclick events on the carousel 
    // previous button until our old current column is in view by initiating calls
    // to carousel_click() until the previous current column is in view.
    //

    for (var i = 0; i < prevCurrentColumn; i++) { 
      carousel_click({
        target: $carouselNext, 
        preventDefault: function() { return; }
      });
    } 
  };


  /**
   * @description Resize the table paginator and our main table container when requested to do so. 
   */

  var resize = function (options, $el) {

    //
    // Use the initial table that our plug-in was bound to if passed it, otherwise
    // use "this" as our scope will be the initial table that our plug-in was bound
    // to when resize() is invoke by a caller other than ourself.
    //
    
    if (! $el) { 
      $el = $(this);
    }

    var data = $el.data("tablePaginator");

    if (data) { 

      var $tablePaginator = data.paginator;
      var $mainTableContainer = $tablePaginator.find("div.mainTableContainer");
      var $table = $mainTableContainer.find("table");
  
      var widths = getWidths($el);  
  
      $tablePaginator.width(widths.tablePaginator);
      $mainTableContainer.width(widths.mainTableContainer);
      $table.width(widths.table);
  
      resetPagination($el);
    }
    else { 
      if (typeof(console) != "undefined" && console.log && console.dir) { 
        console.log("jquery.tablePaginator.js: No tablePaginator data found on $el!");
        //console.dir($el);
      }
    }
  };


  /**
   * @description To reinitialize the plug-in we save our current column, call destroy,
   * call init, and then paginate to the column that was previously in view.
   */

  var reinit = function(options) {

    var data = this.data("tablePaginator");

    if (data) {
      var prevCurrentColumn = data.paginator.data("paginationData").currentColumn;  

      methods.destroy.apply(this, arguments);
      methods.init.apply(this, arguments);

      var $tablePaginator = this.data("tablePaginator").paginator;  
      var $carouselNext = $tablePaginator.find("div.carouselNext");

      for (var i = 0; i < prevCurrentColumn; i++) { 
        carousel_click({
          target: $carouselNext, 
          preventDefault: function() { return; }
        });
      }           
    }
  };


  /**
   * @description Return the table paginator element we've generated so that the caller 
   * can apply additional behavior to it if needed.
   */

  var getTablePaginator  = function() { 
    var $tablePaginator = null;
    var data = this.data("tablePaginator");

    if (data && data.paginator) { 
      $tablePaginator = data.paginator;
    }

    return $tablePaginator;
  };


  /**
   * @description Return the current column to the caller so that they can scroll 
   * back to it if need be.
   */

  var getCurrentColumn = function () {
    var data = this.data("tablePaginator");
    var currentColumn = data.paginator.data("paginationData").currentColumn;
    return currentColumn;
  };


  /**
   * @description Scroll to the specified column by invoking our carosel_click method
   * frequently enough so that the desired column is visible.  
   * TODO: This method does NOT support scrolling back to the beginning of the table,
   * only towards the end of the table.
   */

  var scrollToColumn = function (scrollToColumn) {

    var $tablePaginator = this.data("tablePaginator").paginator;
    var $carouselNext = $tablePaginator.find("div.carouselNext");

    for (var i = 0; i < scrollToColumn; i++) {
      carousel_click({
        target: $carouselNext,
        preventDefault: function () { return; }
      });
    }
  };
  

  /**
   * @description Move the paginator one column to the left if possible.
   */

  var pageLeft = function() { 
    var $tablePaginator = this.data("tablePaginator").paginator;  
    var $carouselPrev = $tablePaginator.find("div.carouselPrevious");
  
    carousel_click({
      target: $carouselPrev, 
      preventDefault: function() { return; }
    });
  };


  /**
   * @description Move the paginator one column to the right if possible.
   */

  var pageRight = function() { 
    var $tablePaginator = this.data("tablePaginator").paginator;  
    var $carouselNext = $tablePaginator.find("div.carouselNext");

    carousel_click({
      target: $carouselNext, 
      preventDefault: function() { return; }
    });
  };

  var windowResizeTimeout = null;

  var window_resize = function(e) {
    window.clearTimeout(windowResizeTimeout);

    var fTimeout = function() { 
      resize(null, e.data.$el); 
    };

    windowResizeTimeout = window.setTimeout(fTimeout, 100);
  };


  /**
   * @description Merge any caller specified options with our default options.
   */

  var getOptions = function(options) { 

    if (! options) { 
      options = {};
    }

    return $.extend({
      resizeWhenWindowResized: false,
      lastColumnStationary: false
    }, options);
  };

  var ellipsize = function(text, length, _bPreserveWords) {

    _bPreserveWords = (typeof _bPreserveWords == "undefined") ? 'true' : _bPreserveWords;

    try {

      if (String(text).length > length) {

        if (!_bPreserveWords) {

          // if _bPreserveWords is set to false then trim the text to the precise length given.

          text = text.substring(0, length) + "...";
        }
        else {

          // Else trim the text to the nearest word length.

          bEllipsized = false;

          // Find the index of the first white space character less than length

          for (var i = text.length - 1; i > 0; i--) {

            if (text.charAt(i) == " " && i <= length) {

              // And then truncate the string at that character and add some elipses

              text = text.substring(0, i) + "...";
              bEllipsized = true;

              break;
            }
          }

          // If we couldn't find a white space character, just truncate the string.

          if (bEllipsized == false) {
            text = text.substring(0, length) + "...";
          }
        }
      } 
    }
    catch (exp) {
      // Do nothing, unable to ellipsize string...
    }

    return text; 
  };

  /**
   * @description Associative array of public methods exposed by the plug-in.
   */

  var methods = {
    "init": init,
    "destroy": destroy,
    "resize": resize,
    "reinit": reinit,
    "getTablePaginator": getTablePaginator,
    "pageLeft": pageLeft,
    "pageRight": pageRight,
    "getCurrentColumn": getCurrentColumn,
    "scrollToColumn": scrollToColumn
  };


  $.fn.tablePaginator = function(method) {
    if (methods[method]) {
      return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
    }
    else if (typeof method === 'object' || !method) {
      return methods.init.apply(this, arguments);
    }
    else {
      $.error('Method ' + method + ' does not exist on jQuery.tablePaginator');
    }
  };

})(jQuery);
