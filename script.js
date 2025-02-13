// Share Functionality
document.getElementById('shareButton').addEventListener('click', function () {
    const shareData = {
        title: 'ArmorX Window Mosquito Net',
        text: "Hey look what I found! Try out this amazing ArmorX Calculator to get a perfect customize fit *Window Mosquito Net* protection for your home. It's so easy to use! Check it out yourself.",
        url: 'https://armorx-net.github.io/ArmorX-Mosquito-Net-Calculator/'
    };

    // Check if Web Share API is supported
    if (navigator.share) {
        navigator
            .share(shareData)
            .then(() => console.log('Shared successfully'))
            .catch((err) => console.error('Error sharing:', err));
    } else {
        // Fallback: Copy to clipboard for unsupported browsers
        navigator.clipboard
            .writeText(`${shareData.text} ${shareData.url}`)
            .then(() => alert('Link copied to clipboard! Share it manually.'))
            .catch((err) => console.error('Error copying link:', err));
    }
});

