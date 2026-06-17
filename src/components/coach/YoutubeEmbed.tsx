interface YoutubeEmbedProps {
    url: string;
}

export const YoutubeEmbed = ({ url }: YoutubeEmbedProps) => {
    const getYoutubeVideoId = (url: string): string | null => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);

        if (match && match[2].length == 11) {
            return match[2];
        } else {
            return null;
        }
    }

    const videoId = getYoutubeVideoId(url);

    if (!videoId) {
        return <div className="aspect-video w-full bg-muted rounded-lg flex items-center justify-center text-muted-foreground">URL video không hợp lệ.</div>
    }

    return (
        <div className="w-full h-full">
            <iframe
                src={`https://www.youtube.com/embed/${videoId}`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
            ></iframe>
        </div>
    );
};
