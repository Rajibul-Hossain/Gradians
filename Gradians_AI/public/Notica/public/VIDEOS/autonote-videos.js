function openVideo(url) {
  document.getElementById("videoFrame").src = url;
  document.getElementById("videoModal").style.display = "flex";
}

function closeVideo() {
  const modal = document.getElementById("videoModal");
  const frame = document.getElementById("videoFrame");
  frame.src = "";
  modal.style.display = "none";
}
