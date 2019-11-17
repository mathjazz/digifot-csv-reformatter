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

    print(results);

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
            calculateShippingCosts(orderItems);
            orderID = currentItem[0];
            orderItems = [currentItem];
        }
    }

    // Make sure we process the last orderItems
    calculateShippingCosts(orderItems);
}

function calculateShippingCosts(orderItems) {
    if (!orderItems.length) {
        return;
    }

    var counts = getItemTypeCounts(orderItems);

    var bookCount = counts.books;
    var wrapCount = counts.wraps;

    var envelopeCost = '0,37';
    var boxCost = '0,59';

    // Wraps only: hard abort
    // TODO: check with customer
    if (!bookCount) {
        return;
    }

    // Books only
    else if (!wrapCount) {
        var envelopeCount = 0;
        var boxCount = Math.floor(bookCount / 8);
        var modulo = bookCount % 8;

        if (modulo > 3) {
            boxCount += 1;
        }
        else if (modulo > 0) {
            envelopeCount = 1;
        }

        for (var i=0; i<orderItems.length; i++) {
            var item = orderItems[i];
            var shippingCosts = '0';

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

    // A combination of books and wraps
    else {
        // TODO
    }
}

function getItemTypeCounts(orderItems) {
    var bookCount = 0;
    var wrapCount = 0;

    for (var i=0; i<orderItems.length; i++) {
        var item = orderItems[i];
        var sku = item[3].toLowerCase();
        var quantity = parseInt(item[4]);

        if (sku.startsWith('hooraystudios-') || sku.startsWith('hurrahelden-')) {
            bookCount += quantity;
        }
        else if (sku.startsWith('hh:')) {
            wrapCount += quantity;
        }
    }

    return {
        books: bookCount,
        wraps: wrapCount,
    }
}

function print(results) {
	console.log('Parse complete');

	console.log('       Time:', (end - start || '(Unknown; your browser does not support the Performance API)'), 'ms');
	console.log('  Row count:', rowCount);
	console.log('     Errors:', errorCount);

	if (errorCount) {
		console.log('First error:', firstError);
    }

	console.log('    Results:', results);
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
