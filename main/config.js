(function () {
    var host = window.location.hostname;
    var isLocal = host === 'localhost' || host === '127.0.0.1' || host === 'custom.local' || host === '';
    window.API_BASE = isLocal
        ? 'http://127.0.0.1:8000'
        : window.location.origin;
})();
