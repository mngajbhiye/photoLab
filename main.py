from rembg import remove
from PIL import Image


input = Image.open('test-photo.JPG')
output = remove(input)
output.save('output.png')