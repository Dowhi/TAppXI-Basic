import sys
from PIL import Image

def remove_background(input_path, output_path):
    img = Image.open(input_path).convert("RGBA")
    data = img.getdata()
    new_data = []

    for item in data:
        r, g, b, a = item
        # If it's very close to greyscale (R~G~B) and it's light (mean > 180)
        # It's likely white or light grey checkerboard
        diff_rg = abs(r - g)
        diff_gb = abs(g - b)
        diff_rb = abs(r - b)
        if diff_rg <= 30 and diff_gb <= 30 and diff_rb <= 30 and r > 185 and g > 185 and b > 185:
            new_data.append((255, 255, 255, 0))
        else:
            new_data.append(item)

    img.putdata(new_data)
    img.save(output_path, "PNG")
    print("Done processing", input_path)

if __name__ == "__main__":
    remove_background(sys.argv[1], sys.argv[2])
