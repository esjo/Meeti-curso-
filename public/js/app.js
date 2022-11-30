import {OpenStreetMapProvider} from 'leaflet-geosearch';
import asistencia from './asistencia';
import eliminarComentario from './eliminarComentario';

//Obtener valores de la base de datos

const lat = document.querySelector('#lat').value || 6.243531;
const lng = document.querySelector('#lng').value || -75.571384;
const direccion = document.querySelector('#direccion').value || '';

const map = L.map('mapa').setView([lat,lng], 15); 
let marker;

//Colocar el pin en edición
let markers = new L.featureGroup().addTo(map);


//Utilizar el provider y GeoCoder
const geocodeService = L.esri.Geocoding.geocodeService({
    apikey: "AAPKfea9ae8e93284467a68a5e59fda8c2bbjucJOQT5Qjo-uwvbR1E2CBw2d5FE6W6WbYsNHsNi5jIC7mYwBTfqYOL6QHSD9TCU"
});

if(lat && lng){
    marker = new L.marker([lat, lng],{
        draggable : true, //Mover Pin
        autoPan: true // Mover Mapa
    })
    .addTo(map)
    .bindPopup(direccion)
    .openPopup();

    markers.addLayer(marker);



    //detectar movimiento del marcador
    marker.on('moveend', function(e){
        marker = e.target;
        const posicion = marker.getLatLng();
        map.panTo(new L.latLng(posicion.lat, posicion.lng));

        //reverse geocoding, cuando el usuario reubica el pin
        geocodeService.reverse().latlng(posicion,15).run(function(error,result){

            llenarInputs(result);

            //asigna los valores al popup del marker
            marker.bindPopup(result.address.LongLabel);

        })
    })  
}


document.addEventListener('DOMContentLoaded', () =>{    
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    


    //Buscar la dirección
    const buscador = document.querySelector('#formbuscador');
    buscador.addEventListener('input', buscarDireccion);
});

function buscarDireccion(e){


    if(e.target.value.length > 8){

        markers.clearLayers();

        

        const provider = new OpenStreetMapProvider();
        provider.search({query: e.target.value}).then((resultado) =>{

            geocodeService.reverse().latlng(resultado[0].bounds[0],15).run(function (error, result) {
                if (error) {
                    console.log(error);
                }else{
                    llenarInputs(result);
                }
                    //mostrar el mapa
                map.setView(resultado[0].bounds[0],15);

                marker = new L.marker(resultado[0].bounds[0],{
                    draggable : true, //Mover Pin
                    autoPan: true // Mover Mapa
                })
                .addTo(map)
                .bindPopup(resultado[0].label)
                .openPopup();

                markers.addLayer(marker);

                //detectar movimiento del marcador
                marker.on('moveend', function(e){
                    marker = e.target;
                    const posicion = marker.getLatLng();
                    map.panTo(new L.latLng(posicion.lat, posicion.lng));

                    //reverse geocoding, cuando el usuario reubica el pin
                    geocodeService.reverse().latlng(posicion,15).run(function(error,result){

                        llenarInputs(result);

                        //asigna los valores al popup del marker
                        marker.bindPopup(result.address.LongLabel);

                    })
                })
            })
            
        })
    }
    
} 


function llenarInputs(resultado){
    document.querySelector('#direccion').value = resultado.address.Address || '';
    document.querySelector('#ciudad').value = resultado.address.City || '';
    document.querySelector('#estado').value = resultado.address.Region || '';
    document.querySelector('#pais').value = resultado.address.CountryCode || '';
    document.querySelector('#lat').value = resultado.latlng.lat || '';
    document.querySelector('#lng').value = resultado.latlng.lng || '';
}
