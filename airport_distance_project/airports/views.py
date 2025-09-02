from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib import messages
import requests
import json


def airport_distance_view(request):
    return render(request, "airport_distance.html")


@csrf_exempt
def calculate_distance(request):
    if request.method == "POST":
        try:
            # Obtener datos del formulario
            aeropuerto_origen = (
                request.POST.get("aeropuerto_origen", "").strip().upper()
            )
            aeropuerto_destino = (
                request.POST.get("aeropuerto_destino", "").strip().upper()
            )

            # Validaciones
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

            if aeropuerto_origen == aeropuerto_destino:
                return JsonResponse(
                    {
                        "success": False,
                        "error": "Los aeropuertos de origen y destino deben ser diferentes.",
                    }
                )

            # URL correcta de la API
            url = f"https://airportgap.com/api/airports/distance?from={aeropuerto_origen}&to={aeropuerto_destino}"
            
            # Realizar la petición GET
            response = requests.get(url, timeout=10)

            if response.status_code == 200:
                datos = response.json()

                result_data = {
                    "success": True,
                    "codigo": datos["data"]["id"],
                    "aeropuerto_origen": {
                        "nombre": datos["data"]["attributes"]["from_airport"]["name"],
                        "ciudad": datos["data"]["attributes"]["from_airport"]["city"],
                        "pais": datos["data"]["attributes"]["from_airport"]["country"],
                        "codigo": aeropuerto_origen,
                    },
                    "aeropuerto_destino": {
                        "nombre": datos["data"]["attributes"]["to_airport"]["name"],
                        "ciudad": datos["data"]["attributes"]["to_airport"]["city"],
                        "pais": datos["data"]["attributes"]["to_airport"]["country"],
                        "codigo": aeropuerto_destino,
                    },
                    "distancia_km": datos["data"]["attributes"]["kilometers"],
                    "distancia_miles": datos["data"]["attributes"]["miles"],
                    "distancia_millas_nauticas": datos["data"]["attributes"]["nautical_miles"],
                }

                return JsonResponse(result_data)

            elif response.status_code == 422:
                return JsonResponse(
                    {
                        "success": False,
                        "error": "Uno o ambos códigos de aeropuerto no existen.",
                    }
                )
            else:
                return JsonResponse(
                    {
                        "success": False,
                        "error": f"Error en la conexión con el API: {response.status_code}",
                    }
                )

        except requests.exceptions.Timeout:
            return JsonResponse(
                {
                    "success": False,
                    "error": "Tiempo de espera excedido. Intente nuevamente.",
                }
            )

        except requests.exceptions.ConnectionError:
            return JsonResponse(
                {
                    "success": False,
                    "error": "Error de conexión con el servidor. Verifique su conexión a internet.",
                }
            )

        except json.JSONDecodeError:
            return JsonResponse(
                {
                    "success": False,
                    "error": "Error al procesar la respuesta del servidor.",
                }
            )

        except Exception as e:
            return JsonResponse(
                {"success": False, "error": f"Error inesperado: {str(e)}"}
            )

    return JsonResponse({"success": False, "error": "Método no permitido. Use POST."})