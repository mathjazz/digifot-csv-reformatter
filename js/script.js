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
            reformat(results);
        }
	}

    print(results);

    download(results);

	setTimeout(enableButton, 100);
}

function reformat(results) {
    results.data[0].push('shipping_costs');

    for (var i=1; i<results.data.length-1; i++) {
        results.data[i].push(0);
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
