import csv
import io

class CSVParserService:
    @staticmethod
    def parse_csv_bytes(contents: bytes):
        try:
            decoded = contents.decode("utf-8")
        except UnicodeDecodeError:
            decoded = contents.decode("latin-1")

        reader = csv.DictReader(io.StringIO(decoded))
        rows = list(reader)
        return rows
