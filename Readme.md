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

##TODO
 - Store date or time (I currently only store dates)
 - Support ObservableArrays