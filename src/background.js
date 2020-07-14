chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.command === 'fetch') {
    fetch(request.url, request.settings)
        .then((response) => response.json())
        .then((response) => sendResponse(response))
        .catch((error) => console.error('Error:', error));
    return true;
  }
});
