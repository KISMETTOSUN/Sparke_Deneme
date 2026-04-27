import os
import time
import datetime
import logging
import json
import requests
from dotenv import load_dotenv
from influxdb_client import InfluxDBClient

# ==================== UIPATH API ====================
UIPATH_TRIGGER_URL = "https://cloud.uipath.com/ucgenautomation/UcgenAutomationDefault/orchestrator_/t/8369ae9c-d391-41dd-b5e4-083539265f6b/Kapi_Acildi"
UIPATH_API_TOKEN = "rt_BBFAC99691E6BAB2E90477E6C16C68A935F989161D17F073421DD5567FA25B40-1"

# ==================== .env YUKLE ====================
load_dotenv()

# InfluxDB 2.x
INFLUX_URL = os.getenv("INFLUX_URL")
INFLUX_TOKEN = os.getenv("INFLUX_TOKEN")
INFLUX_ORG = os.getenv("INFLUX_ORG")
INFLUX_BUCKET = os.getenv("INFLUX_BUCKET")
INFLUX_MEASUREMENT = os.getenv("INFLUX_MEASUREMENT")
INFLUX_FIELD = os.getenv("INFLUX_FIELD")

POLL_INTERVAL = int(os.getenv("POLL_INTERVAL", 30))
STATE_FILE = "kapi_state.json"

# Loglama
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("kapi_engine.log", encoding="utf-8"),
        logging.StreamHandler()
    ]
)
log = logging.getLogger(__name__)

# ==================== DURUM YONETIMI ====================
def durum_yukle():
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, "r") as f:
                return json.load(f)
        except Exception as e:
            log.error(f"Durum dosyasi okunamadi: {e}")
    return {"onceki_sayac": None}

def durum_kaydet(onceki_sayac=None):
    try:
        with open(STATE_FILE, "w") as f:
            json.dump({"onceki_sayac": onceki_sayac}, f)
    except Exception as e:
        log.error(f"Durum dosyasi kaydedilemedi: {e}")

# ==================== INFLUXDB 2.x ====================
def influx_baglan():
    # URL eger None ise baslangicta uyaralim ki karsimiza cikmasin
    if not INFLUX_URL:
        log.error("HATA: InfluxDB URL bulunamadi. .env dosyasi eksik veya ayarlar yok.")
        time.sleep(5)
    
    client = InfluxDBClient(url=INFLUX_URL, token=INFLUX_TOKEN, org=INFLUX_ORG)
    return client

def son_sayac_degerini_al(client):
    query_api = client.query_api()
    query = f'''
        from(bucket: "{INFLUX_BUCKET}")
            |> range(start: -1d)
            |> filter(fn: (r) => r._measurement == "{INFLUX_MEASUREMENT}")
            |> filter(fn: (r) => r._field == "{INFLUX_FIELD}")
            |> last()
    '''
    try:
        tables = query_api.query(query, org=INFLUX_ORG)
        for table in tables:
            for record in table.records:
                return record.get_value()
    except Exception as e:
        log.error(f"InfluxDB sorgu hatasi: {e}")
    return None

# ==================== ANA MANTIK ====================
def engine_calistir():
    log.info("Kapi engine baslatildi.")
    client = influx_baglan()

    durum = durum_yukle()
    onceki_sayac = durum.get("onceki_sayac")

    if onceki_sayac is None:
        while onceki_sayac is None:
            onceki_sayac = son_sayac_degerini_al(client)
            if onceki_sayac is None:
                log.warning("InfluxDB'den ilk sayac degeri alinamadi, tekrar deneniyor...")
                time.sleep(POLL_INTERVAL)

    log.info(f"Baslangic sayac degeri: {onceki_sayac}")

    while True:
        try:
            mevcut_sayac = son_sayac_degerini_al(client)

            if mevcut_sayac is None:
                log.warning("InfluxDB'den veri alinamadi.")
                time.sleep(POLL_INTERVAL)
                continue

            if mevcut_sayac > onceki_sayac:
                log.info(f"Kapi acildi! Sayac: {onceki_sayac} -> {mevcut_sayac}")

                try:
                    headers = {
                        "Authorization": f"Bearer {UIPATH_API_TOKEN}",
                        "X-UIPATH-TenantName": "UcgenAutomationDefault"
                    }
                    res = requests.get(UIPATH_TRIGGER_URL, headers=headers)
                    if res.status_code in [200, 201, 202]:
                        log.info(f"UiPath sureci basariyla tetiklendi. Status code: {res.status_code}")
                    else:
                        log.error(f"UiPath tetiklenemedi: Status={res.status_code}, Hata={res.text}")
                except Exception as api_err:
                    log.error(f"UiPath API istegi sirasinda hata: {api_err}")

                onceki_sayac = mevcut_sayac
                durum_kaydet(onceki_sayac)

            elif mevcut_sayac < onceki_sayac:
                log.info(f"Sayac sifirlanmis veya azalmis: {onceki_sayac} -> {mevcut_sayac}")
                onceki_sayac = mevcut_sayac
                durum_kaydet(onceki_sayac)

        except Exception as e:
            log.error(f"Hata: {e}")

        time.sleep(POLL_INTERVAL)

if __name__ == "__main__":
    engine_calistir()
