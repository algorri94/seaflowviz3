$(function () {
  var events = {};
  var tracksDisplayed = false;
  var map = new SeaflowMap("cruise-map", events);
  var charts = new Charts(events, $(window).width()*0.35);
  var dash = new Dashboard(events);
  $(events).triggerHandler("newcruise", {cruise: "realtime"});
  window.charts = charts;
  window.map = map;
  window.dash = dash;
  $(document).ready(function() {
    $("#show_tracks").click(function(){
    	if(!tracksDisplayed){
        	$(events).triggerHandler("show_tracks");
        	tracksDisplayed = true;
        } else {
        	$(events).triggerHandler("hide_tracks");
        	tracksDisplayed = false;
        }
    });
  });
});
