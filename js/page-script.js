setTimeout(function() {
    /* Example: Send data from the page to your Chrome extension */
    document.dispatchEvent(new CustomEvent('connection', {
        foo: 'bar',
    }));
}, 0);
