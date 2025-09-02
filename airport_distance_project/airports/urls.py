
from django.urls import path
from . import views

app_name = 'airports'

urlpatterns = [
    path('', views.airport_distance_view, name='airport_distance'),
    path('calculate/', views.calculate_distance, name='calculate_distance'),
    path('results/', views.airport_distance_view, name='results'),  # Para compatibilidad
]