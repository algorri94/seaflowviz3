# Seaflow Visualization

![alt tag](http://image.prntscr.com/image/22a7e24accde4a4b9fe846591f2f9e5c.png)

This Seaflow Visualization UI is based on [this project](https://github.com/armbrustlab/seaflowviz3) and built on CSS, JS and HTML. The UI depends on a few frameworks:
- The [JS Leaflet Framework](http://leafletjs.com/) which is located inside the folder called [leaflet](https://github.com/algorri94/sflviz/tree/gh-pages/leaflet). This framework is basically used to display the map and the different markers used inside them (the boat symbol, the path travelled, the recommended steering arrow..)
- The [Bootstrap Framework](http://getbootstrap.com/) which is located in both [css](https://github.com/algorri94/sflviz/tree/gh-pages/css) and [js](https://github.com/algorri94/sflviz/tree/gh-pages/js) folders. This framework takes care of appereance and responsive behaviour.
- The [Jasny Bootstrap Framework](http://www.jasny.net/bootstrap/) which is an extension of Bootstrap and located in the same folders. This framework is used to create the offcanvas menu used for the charts.
- The [Bootstrap Slider](https://github.com/seiyria/bootstrap-slider) which is another extension of Bootstrap and located in the same place. This one is used to create the sliders for the steering configuration.

###CSS
There is a few CSS files inside the [css](https://github.com/algorri94/sflviz/tree/gh-pages/css) folder of the project. Out of those, [seaflow.css](https://github.com/algorri94/sflviz/blob/gh-pages/css/seaflow.css) is the only custom one which does not belong to any framework. This file takes care of the aesthetics like charts' style, buttons' locations, colors and shadows, the elements' sizes...

###HTML
There is just one HTML document in the whole project ([index.html](https://github.com/algorri94/sflviz/blob/gh-pages/index.html)) which specifies the structure of the UI which is very simple. The few elements defined in the file are perfectly commented in the file to make it easy to understand its structure.

###JS
This is where all the logic and behaviour of the UI lays. There's a bunch of Javascript files inside the [js](https://github.com/algorri94/sflviz/tree/gh-pages/js) folder, but many of them are just frameworks. The important javascript files are the following:
  - [plot.js](https://github.com/algorri94/sflviz/blob/gh-pages/js/plot.js): This one is the main program, it initializes the map, the charts and the button listeners that the UI require.
  - [dashboard.js](https://github.com/algorri94/sflviz/blob/gh-pages/js/dashboard.js): This one takes care of the data management, it executes queries to BigDawg periodically and parses the results in order to print them, either in the map or in the charts.
  - [charts.js](https://github.com/algorri94/sflviz/blob/gh-pages/js/charts.js): Like its own name suggets, this javascript file takes care of creating all the charts and update them once new data events are received.
  - [map.js](https://github.com/algorri94/sflviz/blob/gh-pages/js/maps.js): This one's name is pretty clear too. This file prints the map on the screen and prints all the map markers (boat symbol, the path travelled and the steering arrow)

All of these files are perfectly commented as well, so for more information about what they do and how, just check the code, it is pretty clear.  
