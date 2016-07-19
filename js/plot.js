$(function () {
  var events = {};
  var map = new SeaflowMap("cruise-map", events);
  var charts = new Charts(events);
  var dash = new Dashboard(events);
  $(events).triggerHandler("newcruise", {cruise: "realtime"});
  window.charts = charts;
  window.map = map;
  window.dash = dash;
});
