/// <reference path="qunit.js" />
/// <reference path="../Scripts/Core/PageOptions.js" />

var cookieName = "PageOptions-Tests";
var navTimeout = 120;

test("Properties are created", function () {
	PageOptions.sources.clearAll(cookieName);
	var po = new PageOptions(cookieName, {
		name: { type: String, defaultValue: "Fred", storage: "" },
		age: { type: Number, defaultValue: 42, storage: "" },
		graduation: { type: Date, defaultValue: new Date(1234, 5, 6), storage: "" },
		isCool: { type: Boolean, defaultValue: true, storage: "" }
	});

	equal(po.age(), 42);
	equal(+po.graduation(), +new Date(1234, 5, 6));
	equal(po.isCool(), true);
});

function makePersistenceTest(source) {
	return function () {
		PageOptions.sources.clearAll(cookieName);
		var po = new PageOptions(cookieName, {
			name: { type: String, defaultValue: "Fred", storage: source },
			age: { type: Number, defaultValue: 42, storage: source },
			graduation: { type: Date, defaultValue: new Date(1234, 5, 6), storage: source },
			isCool: { type: Boolean, defaultValue: true, storage: source }
		});

		po.age(7);
		po.isCool(false);
		po.graduation(new Date(6543, 2, 1));
		po.name("George");

		var parsed = new PageOptions(cookieName, {
			name: { type: String, defaultValue: "Fred", storage: source },
			age: { type: Number, defaultValue: 42, storage: source },
			graduation: { type: Date, defaultValue: new Date(1234, 5, 6), storage: "" },
			isCool: { type: Boolean, defaultValue: true, storage: "" }
		});

		equal(parsed.age(), po.age());
		equal(parsed.isCool(), po.isCool());
		equal(+parsed.graduation(), +po.graduation());
		equal(parsed.name(), po.name());
	};
}

test("Hash persistence works", makePersistenceTest("fragment"));
test("Cookie persistence works", makePersistenceTest("cookie"));


asyncTest("Changing hash updates properties", function () {
	PageOptions.sources.clearAll(cookieName);

	var po = new PageOptions(cookieName, {
		name: { type: String, defaultValue: "Fred", storage: "fragment" },
		age: { type: Number, defaultValue: 42, storage: "" }
	});

	location.hash = "#name=Percy&age=21";

	setTimeout(function () {
		equal(po.name(), "Percy");
		equal(po.age(), 21);
		start();	//Resume other tests
	}, navTimeout);

});

asyncTest("Removing hash parameter resets that property", function () {
	//This test simulates clicking the back button after changing a property from its default value.
	PageOptions.sources.clearAll(cookieName);
	var po = new PageOptions(cookieName, {
		name: { type: String, defaultValue: "Fred", storage: "fragment" },
		age: { type: Number, defaultValue: 42, storage: "fragment" }
	});

	po.name("Percy");
	location.hash = "#age=21";

	setTimeout(function () {
		equal(po.name(), "Fred");
		equal(po.age(), 21);
		start();	//Resume other tests
	}, navTimeout);
});

asyncTest("Back navigation sets hash properties", function () {
	PageOptions.sources.clearAll(cookieName);

	var po = new PageOptions(cookieName, {
		name: { type: String, defaultValue: "Fred", storage: "fragment" },
		graduation: { type: Date, defaultValue: new Date(1234, 5, 6), storage: "fragment" }
	});

	po.name("Percy");
	po.graduation(new Date(1995, 7, 1));

	history.back();
	setTimeout(function () {
		equal(+po.graduation(), +new Date(1234, 5, 6));

		history.back();
		setTimeout(function () {
			equal(po.name(), "Fred");

			history.forward();
			setTimeout(function () {
				equal(po.name(), "Percy");

				history.forward();
				setTimeout(function () {
					equal(+po.graduation(), +new Date(1995, 7, 1));

					start();	//Resume other tests
				}, navTimeout);
			}, navTimeout);
		}, navTimeout);
	}, navTimeout);
});

asyncTest("Setting cookie properties does not interfere with history", function () {
	PageOptions.sources.clearAll(cookieName);

	var po = new PageOptions(cookieName, {
		name: { type: String, defaultValue: "Fred", storage: "fragment" },
		graduation: { type: Date, defaultValue: new Date(1234, 5, 6), storage: "cookie" }
	});

	po.name("Percy");
	po.graduation(new Date(1995, 7, 1));

	history.back();
	setTimeout(function () {
		equal(po.name(), "Fred");
		equal(+po.graduation(), +new Date(1995, 7, 1));

		history.forward();
		setTimeout(function () {
			equal(po.name(), "Percy");
			equal(+po.graduation(), +new Date(1995, 7, 1));

			start();	//Resume other tests
		}, navTimeout);
	}, navTimeout);
});

test("Aliases are parsed from hash", function () {
	PageOptions.sources.clearAll(cookieName);
	location.hash = "#oldName=Ronald";

	var po = new PageOptions(cookieName, {
		name: { type: String, defaultValue: "Fred", storage: "", aliases: "oldName" },
		age: { type: Number, defaultValue: 42, storage: "fragment" }
	});

	equal("Ronald", po.name());
});

test("Cookie-stored values are not included in hash", function () {
	PageOptions.sources.clearAll(cookieName);

	var po = new PageOptions(cookieName, {
		name: { type: String, defaultValue: "Fred", storage: "fragment" },
		age: { type: Number, defaultValue: 42, storage: "cookie" }
	});

	po.name("Ronald");
	po.age(99);
	equal("name=Ronald", location.hash.replace(/^#/, ""));
	po.name("Fred");
	equal("", location.hash.replace(/^#/, ""));
});

function formatDate(date) {
	return (date.getUTCFullYear() + "-" + (date.getUTCMonth() + 1) + '-' + date.getUTCDate())
                                        .replace(/-(\d)(?=-|$)/g, '-0$1');  //Pad day and month to two digits
}
test("Dates are formatted nicely in hash", function () {
	PageOptions.sources.clearAll(cookieName);

	var po = new PageOptions(cookieName, {
		graduation: { type: Date, defaultValue: new Date(1234, 5, 6), storage: "fragment" }
	});

	po.graduation(new Date("01/02/2012"));  //This is at UTC midnight
	equal(location.hash.replace(/^#/, ""), "graduation=2012-01-02");

	po.graduation(new Date(2012, 05, 06));  //This is at local midnight
	equal(location.hash.replace(/^#/, ""), "graduation=2012-06-06");

	var date = new Date;
	po.graduation(date);
	equal(decodeURIComponent(location.hash.replace(/^#/, "").replace(/\+/g, ' ')), "graduation=" + date.toString());
});

test("Formatted dates are parsed from hash", function () {
	PageOptions.sources.clearAll(cookieName);

	location.hash = "#graduation=2012-06-22";

	var po = new PageOptions(cookieName, {
		graduation: { type: Date, defaultValue: new Date(1234, 5, 6), storage: "fragment" }
	});

	equal(formatDate(po.graduation()), "2012-06-22");
});
test("Default values are not included in hash", function () {
	PageOptions.sources.clearAll(cookieName);

	var po = new PageOptions(cookieName, {
		name: { type: String, defaultValue: "Fred", storage: "fragment" },
		age: { type: Number, defaultValue: 42, storage: "fragment" }
	});

	po.name("Ronald");
	equal("name=Ronald", location.hash.replace(/^#/, ""));
	po.name("Fred");
	equal("", location.hash.replace(/^#/, ""));
});
