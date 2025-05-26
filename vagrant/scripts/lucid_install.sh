# miniconda
mkdir -p ~/miniconda3
wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh -O ~/miniconda3/miniconda.sh
bash ~/miniconda3/miniconda.sh -b -u -p ~/miniconda3
rm ~/miniconda3/miniconda.sh
# initialize conda
#source ~/miniconda3/bin/activate
. ~/miniconda3/etc/profile.d/conda.sh
conda init --all

# create conda env
conda create -n python39 python=3.9 -y
conda activate python39
pip install /vagrant/programs/tensorflow-2.7.1-cp39-cp39-linux_x86_64.whl
pip install scikit-learn==1.2.2 h5py pyshark protobuf==3.19.6
pip install numpy==1.23.5

# copy lucid-ddos
echo "Copying lucid..."
if [ -d "/vagrant/programs" ]; then
    cp /vagrant/programs/lucid-ddos.zip ~/
    unzip ~/lucid-ddos.zip
    rm ~/lucid-ddos.zip
    cp /vagrant/lucid_alert.py ~/lucid-ddos/
else
    echo "No programs found in /vagrant/programs"
fi

#conda deactivate
