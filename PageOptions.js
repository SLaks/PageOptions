/// <reference path="Scripts/jquery-1.8.0.js" />
/// <reference path="Scripts/jquery.ba-bbq.js" />
/// <reference path="Scripts/jquery.cookie.js" />
/// <reference path="Scripts/knockout-2.1.0.debug.js" />

(function (global, undefined) {
	"use strict";
	global.PageOptions = function (cookieName, props) {
		/// <summary>Creates an options object which stores the user's selected options for this page.</summary>
		/// <param name="cookieName" type="String">The name of the cookie to store persistent options.</param>
		/// <param name="props" type="Object">
		/// An object containing the options defined by the page.
		/// Each property must be an object with the following properties:
		///     type:         Javascript type constructor (String, Number, Boolean, Date)
		///     storage:      The string "cookie" or "fragment", or an array or string of both, indicating where to store the value of the option when it changes
		///     defaultValue: The default value of the option, which will be used if the option is in neither the cookie nor the fragment
		///     aliases:      An optional string or array of other names to read from the storage (for backwards compatibility with older URLs)
		///</param>
		//This constructor returns an object with a Knockout.js observable property for each of the options specified.

		//Each property value will come from the URL fragment, the cookie, or the specified default, in that order.  (regardless of the storage option specified)
		//Changing any of the properties will update the cookie or URL fragment, as specified in the storage option.
		//User changes to the fragment (eg, the Back button) will be applied to the properties. (regardless of the storage option specified)

		//The caller should bind to the Knockout.js properties (by calling property.subscribe(callback, context)) to handle changes.
		//The caller should read values from this object when setting up the UI to apply stored values from the URL or cookie.
		//Ideally, the UI inputs should be bound directly to the properties using Knockout.js.

		//The sources (cookie and fragment) are read and written by the objects in the PageOptions.sources object.

		this.cookieName = cookieName;
		this._properties = [];

		var self = this;

		//Loop over the property definitions provided
		//and create observable options properties.
		for (var name in props) {
			if (props[name].defaultValue.constructor !== props[name].type)
				throw new Error("Property " + name + ".defaultValue (" + props[name].defaultValue + ") must be of type " + props[name].type.name);

			this[name] = ko.observable(props[name].defaultValue);
			this[name].equalityComparer = equalityComparer;

			this[name].propertyName = name;
			this[name].type = props[name].type;
			this[name].defaultValue = props[name].defaultValue;

			this[name].aliases = normalizeArray(props[name].aliases);

			this[name].storage = normalizeArray(props[name].storage, ["cookie", "fragment"], "storage");
			//Map names to actual storage objects
			this[name].storage = $.map(this[name].storage, function (elem) { return PageOptions.sources[elem]; });

			this[name].aliases.unshift(name);   //The name has higher priority than any alias

			//When a property changes, update all of its sources.
			(function (property) {
				property.subscribe(function (newValue) { self.writeOptions(property.storage); });
			}(this[name]));

			this._properties.push(this[name]);
		}
		this.readOptions();
		$(window).hashchange(function () {
			//When the user navigates, reset any options that were removed from the URL
			//to default values.  This is needed because properties that are equal to 
			//their defaults are removed from the URL entirely.  If a property is also
			//stored in a cookie, this will override the cookie, since this read will
			//ignore values from cookies.
			self.readOptions([PageOptions.sources.fragment], true);
		});
	}

	var day = 1000 * 60 * 60 * 24;
	//These objects read and write options in different data sources.
	PageOptions.sources = {
		fragment: { //Fragments are unnamed
			read: function (name) {
				return $.deparam($.param.fragment());
			},
			write: function (name, values) {
				$.each(values, function (name, value) {
					//Format dates that don't have times as yyyy-MM-dd
					//Check for both UTC midnight and local midnight.
					if (value instanceof Date && value % day === 0)
						values[name] = (value.getUTCFullYear() + "-" + (value.getUTCMonth() + 1) + '-' + value.getUTCDate())
                                        .replace(/-(\d)(?=-|$)/g, '-0$1');  //Pad day and month to two digits

					else if (value instanceof Date && value % day === value.getTimezoneOffset() * 60 * 1000) //In minutes
						values[name] = (value.getFullYear() + "-" + (value.getMonth() + 1) + '-' + value.getDate())
                                        .replace(/-(\d)(?=-|$)/g, '-0$1');  //Pad day and month to two digits
				});

				$.bbq.pushState(values, 2); //merge_mode = 2: params argument will completely replace current state
			},
			clear: function (name) {
				location.hash = '';
			}
		},
		cookie: {
			read: function (name) {
				return $.parseJSON($.cookie(name)) || {};
			},
			write: function (name, values) {
				$.cookie(name, JSON.stringify(values));
			},
			clear: function (name) {
				$.cookie(name, '', { expires: new Date() - 100000 });
			}
		}
	};
	//This array defines the precedence if two different source supply the same property.
	//In case of conflict, the last source in the array wins.
	PageOptions.sources.order = [PageOptions.sources.cookie, PageOptions.sources.fragment];
	PageOptions.sources.clearAll = function (name) {
		$.each(PageOptions.sources.order, function () { this.clear(name); });
	};

	//Make sure that we can parse ISO dates
	//from JSON.stringify or friendly dates
	//from URL hashes.
	if (isNaN(new Date(JSON.parse(JSON.stringify(new Date))))
	 || isNaN(new Date("2012-03-04"))) {
		var isoDateParser = /^(\d{4})-(\d{2})-(\d{2})((T)(\d{2}):(\d{2})(:(\d{2})(\.\d*)?)?)?(Z)?$/;
		var parseDate = function (val) {
			var m = typeof val === 'string' && val.match(isoDateParser);
			if (m)
				return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[6] || 0, +m[7] || 0, +m[9] || 0, parseInt((+m[10]) * 1000) || 0));

			return new Date(val);	//If it's not ISO or yyyy-MM-dd, relegate to regular parsing
		}
	} else		//If new Date() can handle ISO dates from JSON, just use it.
		parseDate = function (str) { return new Date(str); };


	PageOptions.typeCoercions = {};
	PageOptions.typeCoercions[Date] = function (value) { return parseDate(value); };
	PageOptions.typeCoercions[Boolean] = function (value) { return /^t(rue)?$/i.test(value); };   //BBQ serializes booleans capitalized, which the Boolean function won't parse

	PageOptions.parseValue = function (value, type) {
		/// <summary>Parses a string into an instance of a type.</summary>
		/// <param name="value" type="String">The value from the source provider.</param>
		/// <param name="type" type="Function">The type constructor to coerce it to (String, Number, Boolean, Date)</param>

		//If we have a parser for this type, use it; otherwise, fall
		//back to the type function, which is fine for most types.
		var parser = PageOptions.typeCoercions[type] || type;
		return parser(value);
	};

	PageOptions.prototype.subscribe = function (propertyNames, callback) {
		/// <summary>Adds a change handler to each of the specified properties.</summary>
		/// <param name="propertyNames" type="String[]">The names of the properties to subscribe to.</param>
		/// <param name="callback" type="Function(name, newVal)">A function to call when the property changes.  This is passed the name of the property and the new value.  this will be the options object.</param>
		var self = this;
		$.each(propertyNames, function () {
			var name = this;
			self[this].subscribe(function (newVal) { callback.call(self, name, newVal); });
		});
	};

	PageOptions.prototype.readOptions = function (sources, applyDefaults) {
		/// <summary>Reads existing values from the specified sources into the properties in this instance.</summary>
		/// <param name="sources" type="Array">The sources to read values from, or all sources if ommitted.</param>
		/// <param name="applyDefaults" type="Boolean">If true, any properties stored in these sources that were not returned by the sources will be reset to default values.</param>

		sources = sources || PageOptions.sources.order

		//Merge data from all sources into a single object.
		var name = this.cookieName;
		var sourceValues = $.extend.apply($, [{}].concat($.map(sources, function (source) { return source.read(name); })));

		for (var p = 0; p < this._properties.length; p++) {
			var target = this._properties[p];

			var value = undefined;	//Reset the value after each iteration

			//Find the first alias which we have a value for
			//aliases[0] is always the actual property name.
			for (var i = 0; i < target.aliases.length; i++) {
				if (sourceValues.hasOwnProperty(target.aliases[i])) {
					value = sourceValues[target.aliases[i]];
					break;
				}
			}
			if (value === undefined) {    //If we have no value for this property, skip it.
				if (applyDefaults && intersects(target.storage, sources))	//If we're applying defaults, and this property uses any of the specified storages, reset it.
					target(target.defaultValue);
				continue;
			}

			//Coerce the value to be of the correct type.
			value = PageOptions.parseValue(value, target.type);

			target(value);  //Set the observable property to the new value.
		}
	};

	PageOptions.prototype.writeOptions = function (sources) {
		/// <summary>Writes all non-default options to the specified sources.</summary>

		for (var i = 0; i < sources.length; i++) {
			var values = $.grep(this._properties, function (prop) {
				return $.inArray(sources[i], prop.storage) !== -1
					&& !equalityComparer(prop(), prop.defaultValue);
			});

			var obj = {};
			$.each(values, function () { obj[this.propertyName] = this(); });   //Map the array of observables into an object of plain properties.

			sources[i].write(this.cookieName, obj);
		}
	};

	//Utilities:
	var primitiveTypes = { 'undefined': true, 'boolean': true, 'number': true, 'string': true };
	function equalityComparer(a, b) {
		//Copied from knockout, but modified to compare dates as well.
		if (jQuery.type(a) === "date" && jQuery.type(b) === "date")
			return a.toString() === b.toString();	//Don't compare dates with more precision than we store them.

		var oldValueIsPrimitive = (a === null) || (typeof (a) in primitiveTypes);
		return oldValueIsPrimitive && (a === b);
	}

	function intersects(a, b) {
		/// <summary>Checks whether two arrays have any elements in common.</summary>

		for (var i = 0; i < a.length; i++) {
			if ($.inArray(a[i], b) !== -1)
				return true;
		}
		return false;
	}

	function normalizeArray(str, choices, argName) {
		/// <summary>Converts a caller-supplied multiple-choice string into an array of the specified options.</summary>
		/// <param name="str" type="String">The string or array from the API caller.</param>
		/// <param name="choices" type="Array">The options that are valid. Any other strings will cause an exception.  If this parameter is ommitted, the strings will not be checked.</param>
		/// <param name="argName" type="String">The name of the argument that is being validated. (only used for error messages)</param>

		var options;
		if (str && typeof str === 'string')	//Don't call "".split; that would return [""]
			options = str.split(',');
		else
			options = str || [];

		for (var i = 0; i < options.length; i++) {
			options[i] = $.trim(options[i]);
			if (arguments.length > 1 && $.inArray(options[i], choices) === -1)
				throw new Error(options[i] + " is not a valid option for " + argName + ".\nValid options are " + choices.join(','));
		}

		return options;
	}
})(this);