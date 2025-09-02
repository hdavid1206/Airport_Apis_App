from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_http_methods
from django.contrib import messages
import requests
import json


def airport_distance_view(request):
    """Vista principal que muestra el formulario"""
    return render(request, "airport_distance.html")


@csrf_protect
@require_http_methods(["POST"])
def calculate_distance(request):
    """Vista para calcular la distancia entre aeropuertos"""
    try:
        # Obtener datos del formulario
        aeropuerto_origen = (
            request.POST.get("aeropuerto_origen", "").strip().upper()
        )
        aeropuerto_destino = (
            request.POST.get("aeropuerto_destino", "").strip().upper()
        )

        # Validaciones básicas
        if not aeropuerto_origen or not aeropuerto_destino:
            return JsonResponse(
                {
                    "success": False,
                    "error": "Debe ingresar ambos códigos de aeropuertos.",
                }
            )

        if len(aeropuerto_origen) != 3 or len(aeropuerto_destino) != 3:
            return JsonResponse(
                {
                    "success": False,
                    "error": "El código de aeropuerto debe tener exactamente 3 caracteres.",
                }
            )

        # Validar que sean solo letras
        if not aeropuerto_origen.isalpha() or not aeropuerto_destino.isalpha():
            return JsonResponse(
                {
                    "success": False,
                    "error": "Los códigos de aeropuerto solo pueden contener letras.",
                }
            )

        if aeropuerto_origen == aeropuerto_destino:
            return JsonResponse(
                {
                    "success": False,
                    "error": "Los aeropuertos de origen y destino deben ser diferentes.",
                }
            )

        # Primero verificar si los aeropuertos existen individualmente
        # Esto ayuda a dar mensajes de error más específicos
        
        def verificar_aeropuerto(codigo):
            """Verifica si un aeropuerto existe en la API"""
            try:
                url_check = f"https://airportgap.com/api/airports/{codigo}"
                headers_check = {
                    'User-Agent': 'AirportDistanceCalculator/1.0',
                    'Accept': 'application/json',
                }
                response_check = requests.get(url_check, headers=headers_check, timeout=10)
                return response_check.status_code == 200
            except:
                return False
        
        # Verificar aeropuerto de origen
        if not verificar_aeropuerto(aeropuerto_origen):
            return JsonResponse(
                {
                    "success": False,
                    "error": f"El código de aeropuerto '{aeropuerto_origen}' no se encontró en la base de datos. Verifica que sea un código IATA válido.",
                }
            )
        
        # Verificar aeropuerto de destino
        if not verificar_aeropuerto(aeropuerto_destino):
            return JsonResponse(
                {
                    "success": False,
                    "error": f"El código de aeropuerto '{aeropuerto_destino}' no se encontró en la base de datos. Verifica que sea un código IATA válido.",
                }
            )

        # URL de la API para calcular distancia
        url = f"https://airportgap.com/api/airports/distance?from={aeropuerto_origen}&to={aeropuerto_destino}"
        
        print(f"Realizando petición a: {url}")  # Para debug
        
        # Realizar la petición GET con headers apropiados
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
        
        response = requests.get(url, headers=headers, timeout=15)
        
        print(f"Status code: {response.status_code}")  # Para debug
        print(f"Response content: {response.text[:500]}...")  # Para debug

        if response.status_code == 200:
            datos = response.json()
            
            # Verificar que los datos tengan la estructura esperada
            if 'data' not in datos or 'attributes' not in datos['data']:
                return JsonResponse(
                    {
                        "success": False,
                        "error": "Respuesta del servidor con formato incorrecto.",
                    }
                )

            attributes = datos["data"]["attributes"]
            
            result_data = {
                "success": True,
                "codigo": datos["data"]["id"],
                "aeropuerto_origen": {
                    "nombre": attributes["from_airport"]["name"],
                    "ciudad": attributes["from_airport"]["city"],
                    "pais": attributes["from_airport"]["country"],
                    "codigo": aeropuerto_origen,
                },
                "aeropuerto_destino": {
                    "nombre": attributes["to_airport"]["name"],
                    "ciudad": attributes["to_airport"]["city"],
                    "pais": attributes["to_airport"]["country"],
                    "codigo": aeropuerto_destino,
                },
                "distancia_km": round(float(attributes["kilometers"]), 0),
                "distancia_miles": round(float(attributes["miles"]), 0),
                "distancia_millas_nauticas": round(float(attributes["nautical_miles"]), 0),
            }

            return JsonResponse(result_data)

        elif response.status_code == 422:
            # Intentar con códigos comunes para test
            if aeropuerto_origen in ['BOG', 'BAQ'] or aeropuerto_destino in ['BOG', 'BAQ']:
                return JsonResponse(
                    {
                        "success": False,
                        "error": f"Los aeropuertos {aeropuerto_origen} y {aeropuerto_destino} son códigos válidos, pero no están disponibles en la base de datos de la API. Prueba con códigos como: LAX, JFK, LHR, CDG, MAD, FCO.",
                    }
                )
            return JsonResponse(
                {
                    "success": False,
                    "error": f"Uno o ambos códigos de aeropuerto no son válidos o no están disponibles en la API: {aeropuerto_origen} → {aeropuerto_destino}. Prueba con: LAX, JFK, LHR, CDG, MAD.",
                }
            )
        elif response.status_code == 404:
            return JsonResponse(
                {
                    "success": False,
                    "error": f"Los códigos de aeropuerto {aeropuerto_origen} o {aeropuerto_destino} no fueron encontrados en la base de datos. Prueba con códigos internacionales como: LAX (Los Ángeles), JFK (Nueva York), LHR (Londres), CDG (París), MAD (Madrid).",
                }
            )
        else:
            return JsonResponse(
                {
                    "success": False,
                    "error": f"Error del servidor API (código {response.status_code}). Intente nuevamente.",
                }
            )

    except requests.exceptions.Timeout:
        return JsonResponse(
            {
                "success": False,
                "error": "Tiempo de espera excedido. La consulta tardó demasiado. Intente nuevamente.",
            }
        )

    except requests.exceptions.ConnectionError:
        return JsonResponse(
            {
                "success": False,
                "error": "Error de conexión. Verifique su conexión a internet e intente nuevamente.",
            }
        )

    except json.JSONDecodeError:
        return JsonResponse(
            {
                "success": False,
                "error": "Error al procesar la respuesta del servidor. Intente nuevamente.",
            }
        )

    except KeyError as e:
        return JsonResponse(
            {
                "success": False,
                "error": f"Error en los datos recibidos del servidor: campo {str(e)} no encontrado.",
            }
        )

    except Exception as e:
        print(f"Error inesperado: {str(e)}")  # Para debug
        return JsonResponse(
            {"success": False, "error": "Error inesperado del servidor. Intente nuevamente."}
        )