$(function () {
  
  //Initialize all the elements needed for the UI
  var events = {};
  var tracksDisplayed = false;
  var map = new SeaflowMap("cruise-map", events);
  var charts = new Charts(events, $(window).width()*0.35);
  var dash = new Dashboard(events);
  $(events).triggerHandler("newcruise", {cruise: "realtime"});
  window.charts = charts;
  window.map = map;
  window.dash = dash;

  //Create the slides and set their listeners
  $("#temp_slide").slider({
    min: -1,
    max: 1,
    value: 0,
    tooltip: 'hide'
  }).on('change', function(e){
    $(events).triggerHandler("newtemp", e.value.newValue);
  });
  $("#sal_slide").slider({
    min: -1,
    max: 1,
    value: 0,
    tooltip: 'hide'
  }).on('change', function(e){
    $(events).triggerHandler("newsal", e.value.newValue);
  });

  //Set the historical track button listeners
  $(document).ready(function() {
    $("#show_tracks").click(function(){
    	if(!tracksDisplayed){
          $(this).css('background', 'gray');
          $(this).css('color', 'white');
        	$(events).triggerHandler("show_tracks");
        	tracksDisplayed = true;
        } else {
          $(this).css('background', 'white');
          $(this).css('color', 'black');
        	$(events).triggerHandler("hide_tracks");
        	tracksDisplayed = false;
        }
    });
  });
});
