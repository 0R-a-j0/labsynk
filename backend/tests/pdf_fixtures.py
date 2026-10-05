"""Small deterministic PDF fixtures without provider calls or proprietary documents."""
from io import BytesIO
from pypdf import PdfWriter
from pypdf.generic import DictionaryObject, NameObject, DecodedStreamObject


def text_pdf(pages, tables=None):
    writer = PdfWriter()
    for index, lines in enumerate(pages):
        page = writer.add_blank_page(width=612, height=792)
        font = DictionaryObject({NameObject('/Type'): NameObject('/Font'), NameObject('/Subtype'): NameObject('/Type1'), NameObject('/BaseFont'): NameObject('/Helvetica')})
        page[NameObject('/Resources')] = DictionaryObject({NameObject('/Font'): DictionaryObject({NameObject('/F1'): writer._add_object(font)})})
        commands = []
        for line_number, text in enumerate(lines):
            text = text.replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)')
            commands.append(f'BT /F1 12 Tf 40 {750 - 20 * line_number} Td ({text}) Tj ET')
        if tables and index in tables:
            # Table at y=640: unit, experiment topic, hours.
            rows = tables[index]
            for row_number, row in enumerate(rows):
                y = 640 - 35 * row_number
                for x, value in zip([45, 145, 505], row):
                    commands.append(f'BT /F1 11 Tf {x} {y - 22} Td ({value}) Tj ET')
            for x in [40, 140, 500, 570]:
                commands.append(f'{x} 640 m {x} {640 - 35 * len(rows)} l S')
            for row_number in range(len(rows) + 1):
                y = 640 - 35 * row_number
                commands.append(f'40 {y} m 570 {y} l S')
        stream = DecodedStreamObject()
        stream.set_data('\n'.join(commands).encode('latin-1'))
        page[NameObject('/Contents')] = writer._add_object(stream)
    result = BytesIO()
    writer.write(result)
    return result.getvalue()


def scanned_pdf():
    from PIL import Image, ImageDraw, ImageFont
    image = Image.new('RGB', (1400, 1800), 'white')
    font = ImageFont.truetype('DejaVuSans.ttf', 32)
    draw = ImageDraw.Draw(image)
    lines = ['Subject: Physics Laboratory', 'Subject Code: PHY101', 'List of experiments',
             '1. Measure resistance using Ohms law.', '2. Determine the focal length of a lens.']
    for index, line in enumerate(lines):
        draw.text((80, 100 + 75 * index), line, fill='black', font=font)
    result = BytesIO()
    image.save(result, format='PDF', resolution=150)
    image.close()
    return result.getvalue()
