// "Back to the game" returns to the game that was open, when there is one to return to.
document.getElementById('back')?.addEventListener('click', (event) => {
  if (document.referrer.startsWith(location.origin) && history.length > 1) {
    event.preventDefault();
    history.back();
  }
});
