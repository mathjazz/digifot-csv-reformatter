var fileName = 'reformatted.csv';
var rowCount = 0;
var errorCount = 0;
var firstError;
var start;
var end;

$(function() {
	$('#file').change(function() {
		if ($(this).prop('disabled') === 'true') {
			return;
        }

		// Allow only one parse at a time
		$(this).prop('disabled', true);

		rowCount = 0;
		errorCount = 0;
		firstError = undefined;

        $('#file').parse({
            config: {
                complete: completeFn,
                error: errorFn,
            },
            before: function(file, inputElem) {
                start = now();
                fileName = file.name.substring(0, file.name.length - 4) + '_reformatted.csv'
                console.log('Parsing file...', file);
            },
            error: function(err, file) {
                console.log('ERROR:', err, file);
                firstError = firstError || err;
                errorCount++;
            },
            complete: function() {
                console.log('Done');
            },
        });
	});
});

function completeFn(results) {
	end = now();

	if (results && results.errors) {
		if (results.errors) {
			errorCount = results.errors.length;
			firstError = results.errors[0];
		}
		if (results.data && results.data.length > 0) {
			rowCount = results.data.length;
            addShippingCostsColumn(results);
        }
	}

    download(results);

	setTimeout(enableButton, 100);
}

function addShippingCostsColumn(results) {
    // Add new column header
    results.data[0].push('shipping_costs');

    var orderID = null;
    var orderItems = [];

    // For every line in the CSV file
    for (var i=1; i<results.data.length-1; i++) {
        var currentItem = results.data[i];

        // Collect lines with the same Order_id
        if (currentItem[0] === orderID) {
            orderItems.push(currentItem);
        }
        else {
            processOrder(orderItems);
            orderID = currentItem[0];
            orderItems = [currentItem];
        }
    }

    // Make sure we process the last orderItems
    processOrder(orderItems);
}

function processOrder(orderItems) {
    if (!orderItems.length) {
        return;
    }

    var counts = getOrderItemTypeCounts(orderItems);
    var bookCount = counts.books;
    var wrapCount = counts.wraps;

    // Wraps only: hard abort
    // TODO: consult with customer
    if (!bookCount) {
        return;
    }

    var boxCount = Math.ceil(wrapCount / 2);
    var modulo = wrapCount % 2;

    // How many books fit into 1 box if we have 1 wrap?
    // How many books fit into 2 boxes if we have 3 wraps?
    // TODO: consult with customer
    var remainingBookCount = bookCount - Math.floor(wrapCount * 1.5);
    if (modulo === 1) {
        remainingBookCount = bookCount - Math.floor(wrapCount * 1.5) - 4;
    }

    // Add aditional envelopes and/or boxes for books that don't fit into wraps' boxes
    if (remainingBookCount > 0) {
        var envelopeCount = 0;

        // Split books into groups of 8 books and the remaining group
        boxCount += Math.floor(bookCount / 8);
        modulo = bookCount % 8;

        // Use 1 box for every group of 4-8 books
        if (modulo > 3) {
            boxCount += 1;
        }
        // Use 1 envelope for every group of 1-3 books
        else if (modulo > 0) {
            envelopeCount = 1;
        }

    }

    calculateShippingCost(orderItems, boxCount, envelopeCount);
}

function getOrderItemTypeCounts(orderItems) {
    var bookCount = 0;
    var wrapCount = 0;

    for (var i=0; i<orderItems.length; i++) {
        var item = orderItems[i];
        var quantity = parseInt(item[4]);

        if (isBookType(item)) {
            bookCount += quantity;
        }
        else {
            wrapCount += quantity;
        }
    }

    return {
        books: bookCount,
        wraps: wrapCount,
    }
}

function isBookType(item) {
    var sku = item[3].toLowerCase();

    if (sku.startsWith('hooraystudios-') || sku.startsWith('hurrahelden-')) {
        return true;
    }

    return false;
}

function calculateShippingCost(orderItems, boxCount, envelopeCount) {
    var envelopeCost = '0,37';
    var boxCost = '0,59';

    for (var i=0; i<orderItems.length; i++) {
        var item = orderItems[i];
        var shippingCosts = '0';

        if (!isBookType(item)) {
            item.push(shippingCosts);
            continue;
        }

        if (boxCount > 0) {
            shippingCosts = boxCost;
            boxCount--;
        }
        else if (envelopeCount > 0) {
            shippingCosts = envelopeCost;
            envelopeCount--;
        }

        item.push(shippingCosts);
    }
}

function download(results) {
    const serialized = Papa.unparse(results, {
        delimiter: ';',
        newline: '\r',
    });

    a = document.createElement('a');
    document.body.appendChild(a);
    a.download = fileName;
    a.href = 'data:application/octet-stream,' + encodeURI(serialized);
    a.click();
}

function errorFn(err, file) {
	end = now();
	console.log('ERROR:', err, file);
	enableButton();
}

function enableButton() {
	$('#file').prop('disabled', false);
}

function now() {
	return typeof window.performance !== 'undefined'
			? window.performance.now()
			: 0;
}
