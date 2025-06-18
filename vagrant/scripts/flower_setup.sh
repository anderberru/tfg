sudo apt-get update
sudo apt-get install -y unzip
sudo apt-get install -y python3-pip

# Install Python 3.9 and create a virtual environment
sudo apt install -y software-properties-common
sudo add-apt-repository ppa:deadsnakes/ppa
sudo apt update
sudo apt install -y python3.9 python3.9-venv python3.9-dev python3.9-distutils

python3.9 -m venv ~/py39env
source ~/py39env/bin/activate

# Copy Flower programs based on the argument passed
ARG1="$1"
if [ "$ARG1" = "1" ]; then
    echo "Argument is 1"
    cp /vagrant/programs/flower-bad.zip ~/flower.zip
elif [ "$ARG1" = "0" ]; then
    echo "Argument is 0"
    cp /vagrant/programs/flower.zip ~/flower.zip
else
    echo "Argument is not 1 or 0"
fi
unzip ~/flower.zip -d ~/
rm ~/flower.zip

# Install Flower and TensorFlow
python -m venv ~/flower/venv-flwr-demo
source ~/flower/venv-flwr-demo/bin/activate
echo "source ~/flower/venv-flwr-demo/bin/activate" >> ~/.bashrc
pip install -r ~/flower/requirements.txt
pip uninstall -y tensorflow
pip install /vagrant/programs/tensorflow-2.7.1-cp39-cp39-linux_x86_64.whl
