#PageOptions

##About
The PageOptions library allows you to easily store user state or options in the URL 
(for bookmarks or navigation history) and/or in cookies (for persistent options).  

You simply call the PageOptions constructor and specify the properties to create and where
(cookie, hash, or both) to store them.  The library will give you a ViewModel object linked 
to the appropriate storages, pre-populated with any existing stored values.

You can bind your page directly to this ViewModel, or, for more complicated pages, set this
object as a property in a larger ViewModel (if you don't want to persist most of the ViewModel)

The library will automatically persist all changes made to the properties, and will automatically 
update the properties if the user clicks back or manually changes the URL.

The hash is guaranteed to be ordered and consistent; the library will never generate two different
hashes that represent the same state.

##How to use
```javascript
var options = new PageOptions(
	"MyOptions",
	{ ... }
);
```

The first argument is the name of the cookie used for cookie storage.  If your site has different pages with different sets of persistent options, each one will need a different cookie name.  Currently, no other providers use the name.
    
The second argument specifies the properties to create:

```javascript
	{
		view: { type: String, storage: 'fragment', defaultValue: 'thumbnails' },
		showHidden: { type: Boolean, storage: 'cookie', defaultValue: false }
	}
```
 - `type` should be a Javascript type constructor (`Boolean`, `Date`, `Number`, or `String`)
 - `storage` can be `"cookie"`, `"fragment"`, or both (`"cookie, fragment"`).  This controls where the property will be saved.  (the value will be read from both sources, regardless of what is specified)
 - `defaultValue` specifies what value to use if the name is not found in the cookie or the fragment.

You can also specify `aliases: "name, otherName"` to load the property value from other names as well (useful for migrating from older names)

The constructor will create an object with a Knockout [observable property](http://knockoutjs.com/documentation/observables.html) for each property you specified.  Changing these properties will update the cookie and/or URL (as specified in the PageOptions constructor).  If the user changes the hash (either manually or by clicking Back), the properties will change to match the new hash.

After creating the PageOptions instance, you should add [Knockout change handlers](http://knockoutjs.com/documentation/observables.html#explicitly_subscribing_to_observables) to react to changes in the values:

```javascript
options.view.subscribe(function(newVal) {
	// Activate the new view
};
```

Finally, bind the ViewModel to your UI:
```javascript
ko.applyBindings(options);
```

You can now use Knockout to create UI elements for the options without writing any additional code:
```html
<input type="radio" name="view" id="thumnailView" value="thumbnails" data-bind="checked: view" />
<label for="thumnailView">Thumbnails</label>
```

##Dependencies
 - [Knockout](http://knockoutjs.com/)
 - [jQuery](http://jquery.com)
 - [jQuery.Cookie](https://github.com/carhartl/jquery-cookie) plugin (for cookie storage only)
 - [jQuery BBQ](https://github.com/cowboy/jquery-bbq) plugin (for fragment / hash storage only)


##TODO
 - Store date or time (I currently only store dates)
 - Use HTML5  history API to store state in the query-string
 - Support ObservableArrays
 - Use postMessage() to detect cookie changes from other tabs