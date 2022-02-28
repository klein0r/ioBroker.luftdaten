![Logo](../../admin/luftdaten.png)

# ioBroker.luftdaten

## Konfiguration

### Lokal

1. Baue einen eigenen Sensor und füge ihn zu Deinem lokalen Netzwerk hinzu
2. Erstelle eine neue Instanz des Adapters
3. Wähle einen beliebigen Sensornamen und füge ihn in die erste Spalte ein
4. Wähle "Lokal" als Typ in der zweiten Spalte
5. Füge die IP-Adresse oder den Hostnamen des Sensors in die dritte Spalte ein
6. Speichere die Einstellungen

Warte einige Sekunden, bis die Daten das erste Mal vom Sensor abgeholt werden.

*Bei Bedarf kann der Abfrage-Interval im Tab "Instanzen" angepasst werden (Standard: alle 30 Minuten).*

### Remote

1. Wähle einen Sensor von der offiziellen Karte: [sensor.community](https://sensor.community/en/)
2. Klicke auf den Sensor und kopiere die ID (#XXXXX)
3. Erstelle eine neue Instanz des Adapters
4. Wähle einen beliebigen Sensornamen und füge ihn in die erste Spalte ein
5. Wähle "Remote" als Typ in der zweiten Spalte
6. Füge die ID des Sensors in die dritte Spalte ein (ohne die ``#``)
7. Speichere die Einstellungen

Warte einige Sekunden, bis die Daten das erste Mal vom Sensor abgeholt werden.

*Bei Bedarf kann der Abfrage-Interval im Tab "Instanzen" angepasst werden (Standard: alle 30 Minuten).*

### Beispiel

![Konfigurationsbeispiel](./img/exampleConfiguration.png)