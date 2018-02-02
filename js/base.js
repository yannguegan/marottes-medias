// Helper Handlebars pour gérer les conditions if
Handlebars.registerHelper('ifCond', function (v1, operator, v2, options) {
    switch (operator) {
        case '==':
            return (v1 == v2) ? options.fn(this) : options.inverse(this);
        case '===':
            return (v1 === v2) ? options.fn(this) : options.inverse(this);
        case '<':
            return (v1 < v2) ? options.fn(this) : options.inverse(this);
        case '<=':
            return (v1 <= v2) ? options.fn(this) : options.inverse(this);
        case '>':
            return (v1 > v2) ? options.fn(this) : options.inverse(this);
        case '>=':
            return (v1 >= v2) ? options.fn(this) : options.inverse(this);
        case '&&':
            return (v1 && v2) ? options.fn(this) : options.inverse(this);
        case '||':
            return (v1 || v2) ? options.fn(this) : options.inverse(this);
        case '!=':
            return (v1 || v2) ? options.fn(this) : options.inverse(this);    
        default:
            return options.inverse(this);
    }
});

// Test if page is loaded in iframe
function inIframe() {
    try {
        return window.self !== window.top;
    } catch (e) {
        return true;
    }
}

// Get URL parameters (location bar)
function getUrlVars() { 
    var vars = [],
        hash;
    var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
    for (var i = 0; i < hashes.length; i++) {
        hash = hashes[i].split('=');
        vars.push(hash[0]);
        vars[hash[0]] = hash[1];
    }
    return vars;
}

// Use basic Handlebars templates
function useHBtemplates(data) {
  $('script[type="text/x-handlebars-template"]').each(function() {
      var debug = $(this).attr('data-debug');
      var source = $(this).html();
      var template = Handlebars.compile(source);
      var html = template(data);
      var target = $(this).attr('data-target');
      if (debug == "true") {
        console.log('HB source (' + target + ')');
        console.log(source);
        console.log('HB template (' + target + ')');
        console.log(template);
        console.log('HB html (' + target + ')')
        console.log(html);
      }
      $(target).append(html);
  }); 
}

function useHBtemplate(data, template) {
  $('script[type="text/x-handlebars-template"][data-template="' + template + '"]').each(function() {
      var debug = $(this).attr('data-debug');
      var source = $(this).html();
      var template = Handlebars.compile(source);
      var html = template(data);
      var target = $(this).attr('data-target');
      if (debug == "true") {
        console.log('HB source (' + target + ')');
        console.log(source);
        console.log('HB template (' + target + ')');
        console.log(template);
        console.log('HB html (' + target + ')')
        console.log(html);
      }
      if (target == 'dom_variable') {
        dom_target = $(this).attr('data-target-variable')
        eval(dom_target).prepend(html)
      } else {
        $(target).prepend(html);
      }
  }); 
}

// List of regex to replace all diacritics by standard letter
var diacriticsRegex = [
  {
    "in": /[éëèê]+/g,
    "out": "e"
  },
  {
    "in": /[àäâ]+/g,
    "out": "a"
  },
  {
    "in": /[ô+]+/g,
    "out": "o"
  },
  {
    "in": /[ùûü]+/g,
    "out": "u"
  },
  {
    "in": /[ïî]+/g,
    "out": "i"
  },
  {
    "in": /[\-|\–|\—]+/g,
    "out": " "
  },
  {
    "in": /[’|\']+/g,
    "out": " "    
  }
]

// Remove all diactritics of a string
function removeDiacritics(text) {
  text = text.toLowerCase();
  for (i=0;i< diacriticsRegex.length; i++) {
    text = text.replace(diacriticsRegex[i].in,diacriticsRegex[i].out);
  }
  return text
}

// Detect if current OS is iOS (for small display fixes)
function iOS() {
  var iDevices = [
    'iPad Simulator',
    'iPhone Simulator',
    'iPod Simulator',
    'iPad',
    'iPhone',
    'iPod'
  ];
  if (!!navigator.platform) {
    while (iDevices.length) {
      if (navigator.platform === iDevices.pop()){ return true; }
    }
  }
  return false;
}

// Convert number display to french standard
function numbertoLocale(number, decimal) {
  number = parseFloat(number)
  if (decimal != 0) {
    number = number.toLocaleString('fr-FR', {maximumSignificantDigits: decimal})
  } else {
    number = number.toLocaleString('fr-FR')
  }
  return number
}

// Sort elements according to data attribute
// Container is a selector, elements is a selector, criteria is a number

function sortElementsInPlaceNum(container, elements, data, order) {
  var listElements = $(container).children(elements).get();
  if (order == 'desc') {
    listElements.sort(function(a, b) {
      var compA = parseFloat($(b).attr('data-' + data));
      var compB = parseFloat($(a).attr('data-' + data));
      return (compA < compB) ? -1 : (compA > compB) ? 1 : 0;
    });
  } else {
    listElements.sort(function(a, b) {
      var compA = parseFloat($(a).attr('data-' + data));
      var compB = parseFloat($(b).attr('data-' + data));
      return (compA < compB) ? -1 : (compA > compB) ? 1 : 0;
    });
  }
  $(container).html(listElements);
}

// Round numbers
(function() {
  /**
   * Decimal adjustment of a number.
   *
   * @param {String}  type  The type of adjustment.
   * @param {Number}  value The number.
   * @param {Integer} exp   The exponent (the 10 logarithm of the adjustment base).
   * @returns {Number} The adjusted value.
   */
  function decimalAdjust(type, value, exp) {
    // If the exp is undefined or zero...
    if (typeof exp === 'undefined' || +exp === 0) {
      return Math[type](value)
    }
    value = +value
    exp = +exp
    // If the value is not a number or the exp is not an integer...
    if (value === null || isNaN(value) || !(typeof exp === 'number' && exp % 1 === 0)) {
      return NaN
    }
    // If the value is negative...
    if (value < 0) {
      return -decimalAdjust(type, -value, exp)
    }
    // Shift
    value = value.toString().split('e')
    value = Math[type](+(value[0] + 'e' + (value[1] ? (+value[1] - exp) : -exp)))
    // Shift back
    value = value.toString().split('e')
    return +(value[0] + 'e' + (value[1] ? (+value[1] + exp) : exp))
  }

  // Decimal round
  if (!Math.round10) {
    Math.round10 = function(value, exp) {
      return decimalAdjust('round', value, exp);
    }
  }
  // Decimal floor
  if (!Math.floor10) {
    Math.floor10 = function(value, exp) {
      return decimalAdjust('floor', value, exp);
    }
  }
  // Decimal ceil
  if (!Math.ceil10) {
    Math.ceil10 = function(value, exp) {
      return decimalAdjust('ceil', value, exp);
    }
  }
})()


// Write something in parent DOM
function writeInParent(selector) {
  content = $(selector).detach()
  window.parent.jQuery('body').prepend(content)
}

function getIframePosition() {
  var positiony = window.parent.jQuery('.dml-Dataviz-iframe').offset().top ;
  return positiony
}
// Throttle
function throttle(fn, threshhold, scope) {
  threshhold || (threshhold = 250);
  var last,
  deferTimer;
  return function () {
    var context = scope || this;

    var now = +new Date,
    args = arguments;
    if (last && now < last + threshhold) {
      // hold on to it
      clearTimeout(deferTimer);
      deferTimer = setTimeout(function () {
        last = now;
        fn.apply(context, args);
      }, threshhold);
  } else {
    last = now;
    fn.apply(context, args);
  }
};
}