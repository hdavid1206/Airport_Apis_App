from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_http_methods
from django.contrib import messages
import requests
import json
import logging
import os  # Agregado para token desde env

from .forms import AirportDistanceForm  # Agregado para usar el form en validación

# Configurar logging para debug
logger = logging.getLogger(__name__)

# Token de API (obténlo de https://airportgap.com/account después de registrarte gratis)
API_TOKEN = os.environ.get('AIRPORT_GAP_TOKEN', 'tu_token_aqui_temporalmente')  # Usa .env para producción

def airport_distance_view(request):
    """Vista principal que muestra el formulario"""
    return render(request, "airport_distance.html")

@csrf_protect
@require_http_methods(["POST"])
def calculate_distance(request):
    """Vista para calcular la distancia entre aeropuertos"""
    try:
        # Usar el form para validación (reutiliza clean_ methods)
        form = AirportDistanceForm(request.POST)
        if not form.is_valid():
            errors = form.errors.as_json()
            return JsonResponse({
                "success": False,
                "error": f"Errores en formulario: {errors}"
            })

        aeropuerto_origen = form.cleaned_data["aeropuerto_origen"]
        aeropuerto_destino = form.cleaned_data["aeropuerto_destino"]

        print(f"DEBUG: Códigos recibidos - Origen: {aeropuerto_origen}, Destino: {aeropuerto_destino}")

        # Validación adicional (mantengo la tuya)
        if aeropuerto_origen == aeropuerto_destino:
            return JsonResponse({
                "success": False,
                "error": "Los aeropuertos de origen y destino deben ser diferentes."
            })

        # URL de la API corregida (mismo)
        url = "https://airportgap.com/api/airports/distance"
        
        print(f"DEBUG: URL de la API: {url}")
        
        # Body para POST
        data = {
            'from': aeropuerto_origen,
            'to': aeropuerto_destino
        }
        
        # Headers actualizados con token
        headers = {
            'User-Agent': 'AirportDistanceCalculator/1.0 (Educational Purpose)',
            'Accept': 'application/json',
            'Accept-Language': 'en-US,en;q=0.9',
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {API_TOKEN}'
        }
        
        print(f"DEBUG: Data: {data}")
        print(f"DEBUG: Headers: {headers}")
        
        # Realizar la petición POST (cambiado de GET)
        response = requests.post(url, json=data, headers=headers, timeout=20)
        
        print(f"DEBUG: Status code: {response.status_code}")
        print(f"DEBUG: Response headers: {dict(response.headers)}")
        print(f"DEBUG: Response text (primeros 1000 chars): {response.text[:1000]}")

        if response.status_code == 200:
            try:
                datos = response.json()
                print(f"DEBUG: Datos JSON recibidos: {json.dumps(datos, indent=2)}")
                
                # Verificar estructura de respuesta (mismo)
                if not datos or 'data' not in datos:
                    return JsonResponse({
                        "success": False,
                        "error": "La respuesta de la API no tiene el formato esperado."
                    })

                data = datos["data"]
                
                if 'attributes' not in data:
                    return JsonResponse({
                        "success": False,
                        "error": "La respuesta de la API no contiene los atributos necesarios."
                    })

                attributes = data["attributes"]
                
                required_fields = ['from_airport', 'to_airport', 'kilometers', 'miles', 'nautical_miles']
                missing_fields = [field for field in required_fields if field not in attributes]
                
                if missing_fields:
                    return JsonResponse({
                        "success": False,
                        "error": f"Faltan campos en la respuesta: {', '.join(missing_fields)}"
                    })

                # Extraer información de los aeropuertos (mismo)
                from_airport = attributes["from_airport"]
                to_airport = attributes["to_airport"]
                
                # Construir respuesta exitosa (cambié round a int)
                result_data = {
                    "success": True,
                    "aeropuerto_origen": {
                        "codigo": aeropuerto_origen,
                        "nombre": from_airport.get("name", "No disponible"),
                        "ciudad": from_airport.get("city", "No disponible"),
                        "pais": from_airport.get("country", "No disponible"),
                        "iata": from_airport.get("iata", aeropuerto_origen)
                    },
                    "aeropuerto_destino": {
                        "codigo": aeropuerto_destino,
                        "nombre": to_airport.get("name", "No disponible"),
                        "ciudad": to_airport.get("city", "No disponible"),
                        "pais": to_airport.get("country", "No disponible"),
                        "iata": to_airport.get("iata", aeropuerto_destino)
                    },
                    "distancia_km": int(round(float(attributes["kilometers"]), 0)),
                    "distancia_miles": int(round(float(attributes["miles"]), 0)),
                    "distancia_millas_nauticas": int(round(float(attributes["nautical_miles"]), 0))
                }

                print(f"DEBUG: Resultado final: {json.dumps(result_data, indent=2)}")
                return JsonResponse(result_data)
                
            except (ValueError, KeyError, TypeError) as e:
                print(f"DEBUG: Error procesando JSON: {str(e)}")
                return JsonResponse({
                    "success": False,
                    "error": f"Error procesando la respuesta de la API: {str(e)}"
                })

        elif response.status_code == 422:
            # Error de validación - códigos no válidos (mismo)
            try:
                error_data = response.json()
                error_message = "Códigos de aeropuerto no válidos o no encontrados."
                if 'errors' in error_data:
                    errors = error_data['errors']
                    if isinstance(errors, list) and len(errors) > 0:
                        error_message = errors[0].get('detail', error_message)
                    elif isinstance(errors, dict):
                        error_message = str(errors)
                
                return JsonResponse({
                    "success": False,
                    "error": f"{error_message} Prueba con códigos como: LAX (Los Ángeles), JFK (Nueva York), LHR (Londres), CDG (París), MAD (Madrid)."
                })
            except:
                return JsonResponse({
                    "success": False,
                    "error": f"Los códigos '{aeropuerto_origen}' o '{aeropuerto_destino}' no fueron encontrados. Prueba con códigos internacionales como: LAX, JFK, LHR, CDG, MAD."
                })

        elif response.status_code == 401:
            return JsonResponse({
                "success": False,
                "error": "Autenticación fallida. Verifica tu token de AirportGap en el código (API_TOKEN)."
            })

        elif response.status_code == 404:
            return JsonResponse({
                "success": False,
                "error": f"Servicio no encontrado. Verifica que los códigos '{aeropuerto_origen}' y '{aeropuerto_destino}' sean códigos IATA válidos."
            })
            
        elif response.status_code == 429:
            return JsonResponse({
                "success": False,
                "error": "Demasiadas peticiones. Espera un momento e intenta nuevamente."
            })
            
        elif response.status_code >= 500:
            return JsonResponse({
                "success": False,
                "error": "Error interno del servidor de la API. Intenta nuevamente en unos minutos."
            })
        else:
            return JsonResponse({
                "success": False,
                "error": f"Error del servidor API (código {response.status_code}). Respuesta: {response.text[:200]}..."
            })

    except requests.exceptions.Timeout:
        print("DEBUG: Timeout en la petición")
        return JsonResponse({
            "success": False,
            "error": "Tiempo de espera excedido. La API tardó demasiado en responder. Intenta nuevamente."
        })

    except requests.exceptions.ConnectionError as e:
        print(f"DEBUG: Error de conexión: {str(e)}")
        return JsonResponse({
            "success": False,
            "error": "Error de conexión con la API. Verifica tu conexión a internet e intenta nuevamente."
        })

    except requests.exceptions.RequestException as e:
        print(f"DEBUG: Error de petición: {str(e)}")
        return JsonResponse({
            "success": False,
            "error": f"Error en la petición a la API: {str(e)}"
        })

    except json.JSONDecodeError as e:
        print(f"DEBUG: Error decodificando JSON: {str(e)}")
        return JsonResponse({
            "success": False,
            "error": "La respuesta de la API no es un JSON válido. Intenta nuevamente."
        })

    except Exception as e:
        print(f"DEBUG: Error inesperado: {str(e)}")
        logger.exception("Error inesperado en calculate_distance")
        return JsonResponse({
            "success": False,
            "error": f"Error inesperado: {str(e)}. Por favor, intenta nuevamente."
        })